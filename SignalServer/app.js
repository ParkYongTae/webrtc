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

io.sockets.on('connection', function(socket){

    // join room
    socket.on('join room', function(roomId){

        socket.join(roomId);

        // client count
        var clientsInRoom = io.sockets.adapter.rooms[roomId];
        var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

        //io.sockets.in(roomId).emit("user-joined", socket.id, numClients, clientsInRoom);
        io.sockets.in(roomId).emit("user-joined", socket.id, numClients, Object.keys(clientsInRoom.sockets));
    });

	socket.on('signal', (roomId, toId, message) => {
		io.to(toId).emit('signal', socket.id, message);
        //io.sockets.in(roomId).emit('signal', socket.id, message);
  	});

    socket.on("user-left", function(roomId, socketId){
        if (socket.rooms[roomId]) {
            io.sockets.sockets[socketId].leave(roomId);
        }

        //io.sockets.emit("user-left", roomId, socketId);
        //io.sockets.in(roomId).emit("broadcast-message", socket.id, data);
    });

	socket.on('disconnect', function(roomId) {
        io.sockets.emit("user-left", socket.id);
        //io.sockets.in(roomId).emit("user-left", socket.id);
	});
});