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

    // join room
    socket.on('joinRoom', function(roomId, userName, userImage, isStreamExists){
        socket.join(roomId);

        var joinUserInfo = {
            socketId : socket.id,
            roomId : roomId,
            userName : userName,
            userImage : userImage,
            isStreamExists : isStreamExists
        };

        if(!connectUserListGroupByRoom[roomId]){
            connectUserListGroupByRoom[roomId] = [];
        }

        connectUserListGroupByRoom[roomId].push(joinUserInfo);

        // client list
        var userListInRoom = connectUserListGroupByRoom[roomId];

        io.sockets.in(roomId).emit("userJoined", joinUserInfo, userListInRoom);
    });

    socket.on('signal', (toId, message) => {
        io.to(toId).emit('signal', socket.id, message);
    });

    socket.on('videoToggle', (toId, videoEnabled) => {
        io.to(toId).emit('videoToggle', socket.id, videoEnabled);
    });

    socket.on('disconnect', function() {

        var roomList = Object.keys(connectUserListGroupByRoom);

        for(var i = 0; i < roomList.length; i++) {
            if (roomList[i]) {
                for (var k = 0; k < connectUserListGroupByRoom[roomList[i]].length; k++) {
                    var socketId = connectUserListGroupByRoom[roomList[i]][k].socketId;
                    if (socketId == socket.id) {
                        connectUserListGroupByRoom[roomList[i]].splice(k, 1);

                        if (socket.rooms[roomList[i]]) {
                            io.sockets.sockets[socketId].leave(roomList[i]);
                        }
                    }
                }
            }
        }

        io.sockets.emit("userLeft", socket.id);
    })
});