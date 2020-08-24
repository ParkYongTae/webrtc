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
}).listen(3001);

var io = socketIO.listen(app);

io.on('connection', function(socket){
	io.sockets.emit("user-joined", socket.id, io.engine.clientsCount, Object.keys(io.sockets.clients().sockets));

	socket.on('signal', (toId, message) => {
		io.to(toId).emit('signal', socket.id, message);
  	});

    socket.on("message", function(data){
		io.sockets.emit("broadcast-message", socket.id, data);
    })

	socket.on('disconnect', function() {
		io.sockets.emit("user-left", socket.id);
	})
});