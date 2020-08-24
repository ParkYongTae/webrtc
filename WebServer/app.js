'use strict';

var nodeStatic = require('node-static');

const https = require('https');
const fs = require('fs');
const options = {
	key: fs.readFileSync('./private.pem'),
	cert: fs.readFileSync('./public.pem') 
};

var fileServer = new(nodeStatic.Server)();
var app = https.createServer(options, (req, res)=>{
  fileServer.serve(req, res);
}).listen(3000);

