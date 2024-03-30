const { Server } = require('socket.io');
const { logItOnFile, logItOnConsole } = require('./utility/logUtility');
const fs = require('fs');

const { deletePoll, addUserChoice,
    addPrediction,uniqueUser, validateRoomID, getGameState, createSessionPool,
    addUser, addHost, createSession, calculateStandings
} = require('./utility/sessionManager');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },options
});
  
  const USERNAME_DUPLICATE = "Username taken by your friend :(. Try a new one!";
  const GAME_JOIN_FAILED = "Game join failed - Wrong room id";
  
  io.on("connection", (socket) => {
    logItOnFile("[INFO] A new connection [SKID] " + socket.id);
    let user;
    try {
    user = {
        username:'',
        room:'',
        isHost:false,
        points:0,
        cookie:false
    }
    socket.myCustomUserHandle = user;
    }
    catch {
      socket.emit("[EROR] custom-info", {infoMessage:"Please reload"});
    }
     //create game
    socket.on("create-session", ({username}) => {
      try {
      roomID = createSession();
      logItOnFile("[INFO] a new fanstasy has been created [GAME] " + roomID + "[USER] " + username);
      socket.join(roomID);
      user.username = username;
      user.room = roomID;
      user.isHost = true;
      addHost(user, roomID);
      gameState = getGameState(roomID);
      logItOnFile("[INFO] new session object  [RVAL] " + JSON.stringify(gameState) + " [USER] " + JSON.stringify(user));
      socket.emit("session-created", {gameState, user});
      }
      catch(error) {
        socket.emit("custom-info" ,{infoMessage:"Please try again!"});
        logItOnFile("[EROR] Error in game creation " + error);
      }
    });
    
    //join game
    socket.on("join-session", ({username, roomID, cookie }) => {
      try {
      // check room id valid
      if(validateRoomID(roomID)) {
        if(uniqueUser(username, roomID) || cookie){
        logItOnFile("[INFO] A new player has joined the room-- [GAME] " + roomID + "[USER] " + username);
        //emit to room
  
        //emit it to the user
        if(!cookie) {
        user.username = username;
        user.room = roomID;
        user.isHost = false;
        addUser(user, roomID);
        }
        gameState = getGameState(roomID);
        if(cookie)
        {
        user = gameState.users[username];
        user.cookie = cookie;
        }
        logItOnFile("[INFO] new session object  [RVAL] " + JSON.stringify(gameState) + " [USER] " + JSON.stringify(user));
        socket.emit("existing-game-state", {gameState, user});
        if(!cookie)
        io.to(roomID).emit("player-joined", {user});
        socket.join(roomID);
        }
        else {
          logItOnFile("[UXER] user JOINING failed duplicate username [GAME] " + roomID);
          socket.emit("custom-info", {infoMessage:USERNAME_DUPLICATE})
        }
      }
      else {
        logItOnFile("[UXER] user JOINING failed [GAME] " + roomID);
        socket.emit("custom-error", {errorMessage:GAME_JOIN_FAILED});
      }
      }
      catch(error) {
        socket.emit("custom-info" ,{infoMessage:"Join failed!"});
        logItOnFile("[EROR] Error in join attempt " + error);
      }
      
    });
  
    //create prediction
    socket.on("create-prediction",({roomID, user, predictionObject})=> {
      try {
        let newpredictionObject =  addPrediction(roomID, user, predictionObject);
        logItOnFile("[INFO] Predicition Object [RVAL] " + JSON.stringify(newpredictionObject));
        io.to(roomID).emit('prediction-object', {newpredictionObject, user});
      }
      catch(error) {
        socket.emit("custom-info" ,{infoMessage:"Create Poll again"});
        logItOnFile("[EROR] Error in creating poll" + error);
      }
    });
  
     //user responses to prediction //choice = pid + choiceID
    socket.on("prediction-call",({roomID, choice, user})=> {
      try {
       const predictionChoice = addUserChoice(roomID, choice, user);
       logItOnFile("[INFO] Prediction by users [RVAL] " + JSON.stringify(predictionChoice)  + " [GAME] :" +  roomID + "[USER] " + user.username);
       io.to(roomID).emit("prediction-update", {predictionChoice, user});
      }
      catch(error) {
        socket.emit("custom-info" ,{infoMessage:"Please try again!", choiceError:true});
        logItOnFile("[EROR] Error in updating users pred call " + error);
      }
    });
  
    socket.on("correct-choice", ({roomID, correctChoice, user}) => {
      try {
      const result = calculateStandings(user, roomID, correctChoice);
      logItOnFile("[INFO] Calculated points of players [RVAL] " + JSON.stringify(result)  + " [GAME] :" +  roomID +
      "[USER] " + user.username);
      io.to(roomID).emit("prediction-result", ({result}));
      }
      catch(error) {
        logItOnFile("[EROR] Error in calculating points " + error);
        socket.emit("custom-info" ,{infoMessage:"Please choose again"});
      }
    });

   socket.on("delete-poll", ({user}) => {
    try {
        const deleted = deletePoll(user.room);
        io.to(user.room).emit("deleted-poll", deleted);
    }
    catch (error) {
      logItOnFile("[EROR] Error deleting poll " + error);
      socket.emit("custom-info", {infoMessage:"Could not delete poll"});
    }
   });

   socket.on("message", ({user, message}) => {
    logItOnFile("[INFO] Message [USER] " + user.username + " [MSSG] " + message);
    io.to(user.room).emit("message", ({user, message}));
   })
  
   socket.on("disconnect", (reason) => {
      let userHandle = socket.myCustomUserHandle;
      let username = userHandle.username
      try {
      if(username.length > 0) {
      io.to(userHandle.room).emit("user-disconnected", username);
      logItOnFile("[INFO] Disocnnected [SKID] " + socket.id + " [RVAL] " + username);
      }
      logItOnFile("[INFO] Disocnnected [SKID] " + socket.id);
    }
    catch (error) {
      logItOnFile("[EROR] Failed on disconnection" + error)
    }
    });
  });
  
  try {
    logItOnConsole("[INFO] Creating ession pool....");
    createSessionPool();  
    logItOnConsole("[INFO] Starting game server .....");
    io.listen(3000);
  }
  
  catch(e) {
    logItOnFile("[EROR] Failed to start server...Exiting.. " + e)
  }