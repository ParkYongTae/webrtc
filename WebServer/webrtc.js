var socket;
var localVideo;
var firstPerson = false;
var socketCount = 0;
var socketId;
var localStream;
var connections = [];
var roomId = 'A';

window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(str, key, value) {
    if(key == 'roomId') {
        roomId = value;
    }
});

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {
            'urls': 'turn:videoturn.pnpplanner.com:3478?transport=udp',
            'credential': 'pnpsoft',
            'username': 'pnpp77!!'
        },
        {
            'urls': 'turn:videoturn.pnpplanner.com:3478?transport=tcp',
            'credential': 'pnpsoft',
            'username': 'pnpp77!!'
        }
    ]
};

function pageReady() {

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    var constraints = {
        video: true,
        audio: false,
    };

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function(){

                socket = io.connect(config.host, {secure: true});

                socket.on('signal', gotMessageFromServer);

                socket.on('connect', function(){

                    socketId = socket.id;

                    // join room
                    socket.emit('join room', roomId);

                    socket.on('user-left', function(roomId, socketId){
                        var video = document.querySelector('[data-socket="'+ socketId +'"]');

                        if(video) {
                            var parentDiv = video.parentElement;
                            video.parentElement.parentElement.removeChild(parentDiv);
                        }
                    });

                    socket.on('user-joined', function(id, count, clients){
                        clients.forEach(function(socketListId) {
                            if(!connections[socketListId]){
                                connections[socketListId] = new RTCPeerConnection(peerConnectionConfig);
                                //Wait for their ice candidate       
                                connections[socketListId].onicecandidate = function(){
                                    if(event.candidate != null) {
                                        console.log('SENDING ICE');
                                        socket.emit('signal', roomId, socketListId, JSON.stringify({'ice': event.candidate}));
                                    }
                                }

                                //Wait for their video stream
                                connections[socketListId].onaddstream = function(){
                                    gotRemoteStream(event, socketListId)
                                }    

                                //Add the local video stream
                                connections[socketListId].addStream(localStream);                                                                
                            }
                        });

                        //Create an offer to connect with your local description
                        if(count >= 2){
                            connections[id].createOffer().then(function(description){
                                connections[id].setLocalDescription(description).then(function() {
                                    // console.log(connections);
                                    socket.emit('signal', roomId, id, JSON.stringify({'sdp': connections[id].localDescription}));
                                }).catch(e => console.log(e));        
                            });
                        }
                    });                    
                })       
        
            }); 
    } else {
        alert('Your browser does not support getUserMedia API');
    } 
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    //localVideo.src = window.URL.createObjectURL(stream);
    localVideo.srcObject = stream;
}

function gotRemoteStream(event, id) {
    var videos = document.querySelectorAll('video');
    var video  = document.createElement('video');
    var div    = document.createElement('div');

    video.setAttribute('data-socket', id);
    //video.src         = window.URL.createObjectURL(event.stream);
    video.srcObject = event.stream;
    video.autoplay    = true; 
    video.muted       = true;
    video.playsinline = true;
    
    div.appendChild(video);      
    document.querySelector('.videos').appendChild(div);      
}

function gotMessageFromServer(fromId, message) {

    //Parse the incoming signal
    var signal = JSON.parse(message);

    //Make sure it's not coming from yourself
    if(fromId != socketId) {

        if(signal.sdp){            
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {                
                if(signal.sdp.type == 'offer') {
                    connections[fromId].createAnswer().then(function(description){
                        connections[fromId].setLocalDescription(description).then(function() {
                            socket.emit('signal', roomId, fromId, JSON.stringify({'sdp': connections[fromId].localDescription}));
                        }).catch(e => console.log(e));        
                    }).catch(e => console.log(e));
                }
            }).catch(e => console.log(e));
        }
    
        if(signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }                
    }
}