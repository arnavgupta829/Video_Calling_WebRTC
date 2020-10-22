var localID;
var localStream;
var peerConnections = {};

var constraints = {
    video: {
	width: {max: 320},
      	height: {max: 240},
      	frameRate: {max: 30},
	},
    audio: true,
};

function updateLayout(){
    var rowHeight = '98vh';
    var colWidth = '98vw';
  
    var numVideos = Object.keys(peerConnections).length + 1;
  
    if (numVideos > 1 && numVideos <= 4) {
      rowHeight = '48vh';
      colWidth = '48vw';
    } else if (numVideos > 4) {
      rowHeight = '32vh';
      colWidth = '32vw';
    }
  
    document.documentElement.style.setProperty(`--rowHeight`, rowHeight);
    document.documentElement.style.setProperty(`--colWidth`, colWidth);
}

function makeLabel(label) {
    var vidLabel = document.createElement('div');
    vidLabel.appendChild(document.createTextNode(label));
    vidLabel.setAttribute('class', 'videoLabel');
    return vidLabel;
  }

function createID(){
    var ID = "";
    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    for(var i = 0; i<10; i++){
        ID += chars.charAt(Math.floor(Math.random()*62));
    }
    return ID;
}

function gotRemoteStream(event, peerUuid){
    if((document.getElementById("remoteVideo_"+peerUuid)) == null){
        console.log(`got remote stream, peer ${peerUuid}`);

        var vidElement = document.createElement('video');
        vidElement.setAttribute('autoplay', '');
        vidElement.setAttribute('muted', '');
        vidElement.srcObject = event.streams[0];
    
        var vidContainer = document.createElement('div');
        vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid);
        vidContainer.setAttribute('class', 'videoContainer');
        vidContainer.appendChild(vidElement);
        vidContainer.appendChild(makeLabel(peerUuid));
    
        document.getElementById('videos').appendChild(vidContainer);
    
        updateLayout();
    }
}

function checkPeerDisconnect(event, peerUuid){
    var state = peerConnections[peerUuid].pc.iceConnectionState;
    console.log(`connection with peer ${peerUuid} ${state}`);
    if (state === "failed" || state === "closed" || state === "disconnected") {
      delete peerConnections[peerUuid];
      document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + peerUuid));
      updateLayout();
    }
}

var serverConfig = {
    "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
};

function handleSetup(number, peerId, destination){
    if(destination == "all" || destination == localID){
        peerConnections[peerId] = {id: peerId, pc: new RTCPeerConnection(serverConfig)};
        peerConnections[peerId].pc.addStream(localStream);
        if(number != 'second'){
            conn.send(JSON.stringify({
                type: 'setup',
                number: 'second',
                id: localID,
                destination: peerId
            }))
        }
    }
    if(destination == localID){
        peerConnections[peerId].pc.createOffer(function(offer){
            
            conn.send(JSON.stringify({
                type: 'offer',
                id: localID,
                offer: offer,
                destination: peerId,
            }));
            peerConnections[peerId].pc.setLocalDescription(offer);

        }, function(err){
            console.log(error);
        });
    }

    peerConnections[peerId].pc.onicecandidate = function(event){
        if(event.candidate){
            conn.send(JSON.stringify({
                type: 'candidate',
                id: localID,
                candidate: event.candidate,
                destination: peerId,
            }));
        }
    };

    peerConnections[peerId].pc.ontrack = function(event){
        gotRemoteStream(event, peerId)
    };

    peerConnections[peerId].pc.oniceconnectionstatechange = function(event){
        checkPeerDisconnect(event, peerId);
    };

}

function handleOffer(offer, peerId, destination){
    if(localID == destination){
        peerConnections[peerId].pc.setRemoteDescription(new RTCSessionDescription(offer));
        peerConnections[peerId].pc.createAnswer(function (answer){

            conn.send(JSON.stringify({
                type: 'answer',
                id: localID,
                answer: answer,
                destination: peerId,
            }));
            peerConnections[peerId].pc.setLocalDescription(answer);

        }, function(error){
            console.log(error);
        })
    }
}

function handleAnswer(answer, peerId, destination){
    if(localID == destination){
        peerConnections[peerId].pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
}

function handleCandidate(candidate, peerId, destination){
    if(localID == destination){
        peerConnections[peerId].pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
}

const roomName = JSON.parse(document.getElementById('room-name').textContent);

const conn = new WebSocket('ws://' + window.location.host + '/ws/call/' + roomName + '/');

conn.onopen = function(){
    console.log("Connected to the signalling server")
}

conn.onmessage = function(msg){
    var data = JSON.parse(msg.data);
    if(data.kind == "VC" && data.id != localID){
        console.log("Got message", msg.data);
        switch(data.type){
            case "setup":
                handleSetup(data.number, data.id, data.destination);
                break;
            case "offer": 
                handleOffer(data.offer, data.id, data.destination); 
                break; 
            case "answer": 
                handleAnswer(data.answer, data.id, data.destination); 
                break; 
            case "candidate":
                handleCandidate(data.candidate, data.id, data.destination); 
                break; 
            default: 
                break;
        }
    }
    else if(data.kind == "Chat"){
        document.querySelector("#chat-log").value += (data.id)+": "+(data.message)+"\n";
    }
}

conn.onerror = function (err) { 
    console.log("Got error", err); 
 }

function onLoad(){
    localID = createID();
    console.log("Local ID: "+localID);
    if(!!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)){
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        navigator.getUserMedia(constraints, function(stream){
            
            localStream = stream;

            document.getElementById('localVideoContainer').appendChild(makeLabel(localID));
            document.querySelector('#localVideo').srcObject = stream;
            console.log("streaming local");

            conn.send(JSON.stringify({
                number: 'first',
                type: 'setup',
                id: localID,
                destination: 'all'
            }));


        }, function(error){
            console.log(error);
        })
    }
    else{
        alert("WebRTC is not supported on your browser!");
    }
}

onLoad();

document.querySelector('#chat-message-input').focus();
document.querySelector('#chat-message-input').onkeyup = function(e) {
    if (e.keyCode === 13) {  // enter, return
        document.querySelector('#chat-message-submit').click();
    }
};

document.querySelector('#chat-message-submit').onclick = function(e) {
    const messageInputDom = document.querySelector('#chat-message-input');
    const message = messageInputDom.value;
    conn.send(JSON.stringify({
        'id': localID,
        'type': 'textmessage',
        'message': message
    }));
    messageInputDom.value = '';
};

var screenshare = document.getElementById('screenshare');
var frontcamera = document.getElementById("frontcamera");

screenshare.onclick = enableScreenshare;
frontcamera.onclick = enableCamera;

function enableScreenshare(){
    navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
    }).then(function(stream){
        document.querySelector('#localVideo').srcObject = stream;
        var screenTrack = stream.getVideoTracks()[0];
        for(const item in peerConnections){
            var sender = peerConnections[item].pc.getSenders().find(function(s){
                return s.track.kind == screenTrack.kind;
            });
            sender.replaceTrack(screenTrack);
        };
    }).catch(function(error){
        console.log(error);
    });
}

function enableCamera(){
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
        document.querySelector('#localVideo').srcObject = stream;
        var cameraTrack = stream.getVideoTracks()[0];
        for(const item in peerConnections){
            var sender = peerConnections[item].pc.getSenders().find(function(s){
                return s.track.kind == cameraTrack.kind;
            });
            sender.replaceTrack(cameraTrack);
        };
    }).catch(function(error){ 
        console.log(error);
    });
}

var recordingChunks = []
var mediaRecorder;

var record = document.getElementById('record_call');
var download = document.getElementById('download_call');

record.onclick = toggleRecording;
download.onclick = downloadRecording;

function toggleRecording(){
    if(record.value == "Start Recording"){
        record.value = "Stop Recording";
        if(download.disabled == false)
            download.disabled = true;
        startRecording();
    }
    else{
        mediaRecorder.stop();
        record.value = "Start Recording";
        download.disabled = false;
    }
}

function startRecording(){
    recordingChunks = [];
    navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
    }).then(function(stream){
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.start();
    }).catch(function(error){
        console.log(error)
    });
}

function handleDataAvailable(event){
    if(event.data.size > 0)
        recordingChunks.push(event.data);
}

function downloadRecording(){
    var a = document.getElementById("downloadLink");
    var blob = new Blob(recordingChunks, {
        type: 'video/webm'
    });
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'screen_recording_for_'+localID;
    a.click();
    window.URL.revokeObjectURL(url);
}
