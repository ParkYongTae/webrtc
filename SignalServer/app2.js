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

    // check video chat list
    socket.on('checkVideoChatList', function(){

        var roomList = Object.keys(connectUserListGroupByRoom);

        var videoChatList = [];

        for(var i = 0; i < roomList.length; i++) {
            if (roomList[i] && connectUserListGroupByRoom[roomList[i]].length > 0) {
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

        var checkResult = {
            type : "SUCCESS"
        };

        if(connectUserListGroupByRoom[roomId].length >= 10) {
            checkResult.type = 'FULL'
        }

        io.to(socket.id).emit('checkRoomResult', checkResult);
    });

    // join room
    socket.on('joinRoom', function(roomId, userName, userImage, isStreamExists){
        if(!connectUserListGroupByRoom[roomId]){
            connectUserListGroupByRoom[roomId] = [];
        }

        socket.join(roomId);

        var joinUserInfo = {
            socketId: socket.id,
            roomId: roomId,
            userName: userName,
            userImage: userImage,
            isStreamExists: isStreamExists,
            videoEnabled: true
        };

        connectUserListGroupByRoom[roomId].push(joinUserInfo);

        // client list
        var userListInRoom = connectUserListGroupByRoom[roomId];

        io.sockets.in(roomId).emit("userJoined", joinUserInfo, userListInRoom);
    });

    socket.on('signal', (toId, message) => {
        io.to(toId).emit('signal', socket.id, message);
    });

    socket.on('videoToggle', (roomId, toId, videoEnabled) => {

        for (var i = 0; i < connectUserListGroupByRoom[roomId].length; i++) {
            if (socket.id == connectUserListGroupByRoom[roomId][i].socketId) {
                connectUserListGroupByRoom[roomId][i].videoEnabled = videoEnabled;
                break;
            }
        }

        io.to(toId).emit('videoToggle', socket.id, videoEnabled);
    });

    socket.on('disconnect', function() {

        var roomList = Object.keys(connectUserListGroupByRoom);

        for(var i = 0; i < roomList.length; i++) {
            if (connectUserListGroupByRoom[roomList[i]]) {
                for (var k = 0; k < connectUserListGroupByRoom[roomList[i]].length; k++) {
                    var socketId = connectUserListGroupByRoom[roomList[i]][k].socketId;
                    if (socketId == socket.id) {
                        connectUserListGroupByRoom[roomList[i]].splice(k, 1);

                        socket.leave(roomList[i]);
                        socket.disconnect();
                    }
                }
            }
        }

        io.sockets.emit("userLeft", socket.id);
    })
});
