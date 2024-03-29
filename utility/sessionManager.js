const {numberOfRandomStringsOfLengthN} = require('./randomStringGenerator');
const activeSession = new Map();
const sessionPool = new Array();
const createSessionObject = () => {
    return ({
        public: {
        roomId:'',
        host:{},
        users:{},
        livePrediction:false,
        userChoiceAdded:false,
        currentPrediction:{},
        },
        private: {
            predictionHistory:[],
            predictionIDPool:[],
            userCount:0
        }
    })
}

const createSession = () => {
     let roomId = sessionPool.pop();
     activeSession.set(roomId, createSessionObject());
     activeSession.get(roomId).public.roomId = roomId;
     activeSession.get(roomId).private.predictionIDPool = numberOfRandomStringsOfLengthN(200, 5);
     return roomId;
}

const addHost = (user, roomId) => {
    activeSession.get(roomId).public.host = user;
    activeSession.get(roomID).public.users[user.username] = user;
}

const addUser = (user, roomID) => {
    activeSession.get(roomID).public.users[user.username] = user;
}

const createSessionPool = () => {
    let pool = numberOfRandomStringsOfLengthN(5000, 5);
    pool.forEach(poolid => sessionPool.push(poolid));
}

const getGameState = (roomID) => {
    return activeSession.get(roomID).public;
}

const validateRoomID = (roomID) =>{
    return activeSession.has(roomID);
}

const uniqueUser = (username, roomID, team) => {
    game = activeSession.get(roomID);
    if(username in game.public.users) {
        return false;
    }
    return true;
}

const addPrediction = (roomID, user, predictionObject) => {
    let newpredictionObject = {};
    newpredictionObject.predictionOptions = {}
    newpredictionObject.predictionId = activeSession.get(roomID).private.predictionIDPool.pop();
    newpredictionObject.locked = false;
    newpredictionObject.predictionTitle = predictionObject.predictionTitle;
    predictionObject.predictionOptions.forEach(option => {
        newpredictionObject.predictionOptions[option.optionId] = {
            optionId:option.optionId,
            optionText: option.optionText,
            optionValid: false,
            usersList:[]
        }
    });
    newpredictionObject.predictionPoint = predictionObject.predictionPoint;
    activeSession.get(roomID).public.currentPrediction = newpredictionObject;
    activeSession.get(roomID).public.livePrediction = true;
    activeSession.get(roomID).public.userChoiceAdded = false;
    return newpredictionObject;
}

const addUserChoice = (roomID, choice, user) => {
    let session = activeSession.get(roomID);
    session.public.userChoiceAdded = true;
    session.public.currentPrediction.predictionOptions[choice].usersList.push(user.username);

    return choice;
}

const calculateStandings = (user, roomID, predictionObject) => {
    let session = activeSession.get(roomID);
    if(user.isHost) {
        Object.keys(predictionObject.predictionOptions).forEach(key => {
            if(predictionObject.predictionOptions[key].optionValid) {
                session.public.currentPrediction.predictionOptions[key].optionValid = true;
                session.public.currentPrediction.predictionOptions[key].usersList.forEach(
                    user => {
                        session.public.users[user].points = 
                        session.public.users[user].points + session.public.currentPrediction.predictionPoint;
                    }
                )
            }
        });
        session.private.predictionHistory.push({...session.public.currentPrediction});
        session.public.livePrediction = false;
        return session.public
    }
}

const deletePoll = (room) => {
    activeSession.get(room).public.livePrediction = false;
    activeSession.get(room).public.userChoiceAdded = false;
    activeSession.get(room).public.currentPrediction = { };
    return activeSession.get(room).public.livePrediction;
}

const removeUser = (user) => {
     delete activeSession.get(user.room).public.users[user.username]
}

module.exports = { removeUser, deletePoll, addUserChoice,
    addPrediction,uniqueUser, validateRoomID, getGameState, createSessionPool,
    addUser, addHost, createSession, calculateStandings

}