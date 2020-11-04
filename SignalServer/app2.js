'use strict';

var nodeStatic = require('node-static');
var socketIO = require('socket.io');

const https = require('https');
const fs = require('fs');
const options = {
    key: fs.readFileSync('./private.pem'),
    cert: fs.readFileSync('./public.pem')
};

var fileServer = new(nodeStatic.Server)();
var app = https.createServer(options, (req, res)=>{
    fileServer.serve(req, res);
}).listen(8080, "0.0.0.0", function(){});

var io = socketIO.listen(app);

var connectUserListGroupByRoom = [];

io.sockets.on('connection', function(socket){

    var myUserId = '';

    // check video chat list
    socket.on('checkVideoChatList', function(){

        var roomList = Object.keys(io.sockets.adapter.rooms);

        var videoChatList = [];

        for(var i = 0; i < roomList.length; i++) {

            if(!connectUserListGroupByRoom[roomList[i]]){
                connectUserListGroupByRoom[roomList[i]] = [];
            }

            // client count
            // var clientsInRoom = io.sockets.adapter.rooms[roomList[i]];
            // var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
            var numClients = connectUserListGroupByRoom[roomList[i]].length;

            if (numClients > 0) {
                videoChatList.push(roomList[i]);
            }
        }

        io.to(socket.id).emit('checkVideoChatListResult', videoChatList);
    });

    // check room
    socket.on('checkRoom', function(roomId){
        if(!connectUserListGroupByRoom[roomId]){
            connectUserListGroupByRoom[roomId] = [];
        }

        // client count
        //var clientsInRoom = io.sockets.adapter.rooms[roomId];
        //var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        var numClients = connectUserListGroupByRoom[roomId].length;

        var checkResult = {
            type : "SUCCESS"
        };

        if(numClients >= 10) {
            checkResult.type = 'FULL'
        }

        io.to(socket.id).emit('checkRoomResult', checkResult);
    });

    // join room
    socket.on('joinRoom', function(roomId, userId, userName, userImage, isStreamExists){
        if(!connectUserListGroupByRoom[roomId]){
            connectUserListGroupByRoom[roomId] = [];
        }

        socket.join(roomId);

        myUserId = userId;

        var joinUserInfo = {
            socketId: socket.id,
            roomId: roomId,
            userId: userId,
            userName: userName,
            userImage: userImage,
            isStreamExists: isStreamExists,
            videoEnabled: true
        };

        for(var i = 0; i < connectUserListGroupByRoom[roomId].length; i++){
            if(connectUserListGroupByRoom[roomId][i].userId == joinUserInfo.userId){
                connectUserListGroupByRoom[roomId].splice(i, 1);
                break;
            }
        }

        connectUserListGroupByRoom[roomId].push(joinUserInfo);

        // client list
        var userListInRoom = connectUserListGroupByRoom[roomId];

        io.sockets.in(roomId).emit("userJoined", joinUserInfo, userListInRoom);
    });

    socket.on('signal', (toSocketId, message) => {
        io.to(toSocketId).emit('signal', socket.id, myUserId, message);
    });

    socket.on('videoToggle', (roomId, userId, videoEnabled) => {

        for (var i = 0; i < connectUserListGroupByRoom[roomId].length; i++) {
            if (userId == connectUserListGroupByRoom[roomId][i].userId) {
                connectUserListGroupByRoom[roomId][i].videoEnabled = videoEnabled;
                break;
            }
        }

        io.sockets.in(roomId).emit('videoToggle', userId, videoEnabled);
    });

    socket.on('disconnect', function() {

        var roomList = Object.keys(connectUserListGroupByRoom);

        var userId = '';

        for(var i = 0; i < roomList.length; i++) {
            if (connectUserListGroupByRoom[roomList[i]]) {
                for (var k = 0; k < connectUserListGroupByRoom[roomList[i]].length; k++) {
                    var socketId = connectUserListGroupByRoom[roomList[i]][k].socketId;
                    if (socketId == socket.id) {
                        userId = connectUserListGroupByRoom[roomList[i]][k].userId;
                        connectUserListGroupByRoom[roomList[i]].splice(k, 1);

                        socket.leave(roomList[i]);
                        socket.disconnect();
                    }
                }
            }
        }

        io.sockets.emit("userLeft", userId);
    })
});
