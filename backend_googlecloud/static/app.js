// Code taken from and modified https://stackoverflow.com/questions/60032983/record-voice-with-recorder-js-and-upload-it-to-python-flask-server-but-wav-file
//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;                      //stream from getUserMedia()
var rec;                            //Recorder.js object
var input;                          //MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");

var timeleft = 10;
//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);


function startRecording() {
    console.log("recordButton clicked");

    /*
        Simple constraints object, for more advanced audio features see
        https://addpipe.com/blog/audio-constraints-getusermedia/
    */

    var constraints = { audio: true, video:false }

    /*
        Disable the record button until we get a success or fail from getUserMedia() 
    */

    recordButton.disabled = true;

    /*
        We're using the standard promise based getUserMedia() 
        https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    */

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

        /*
            create an audio context after getUserMedia is called
            sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
            the sampleRate defaults to the one set in your OS for your playback device

        */
        audioContext = new AudioContext();

        /*  assign to gumStream for later use  */
        gumStream = stream;

        /* use the stream */
        input = audioContext.createMediaStreamSource(stream);

        /* 
            Create the Recorder object and configure to record mono sound (1 channel)
            Recording 2 channels  will double the file size
        */
        rec = new Recorder(input,{numChannels:1})

        //start the recording process
        rec.record()
        document.getElementById('result').innerHTML = "";
        console.log("Recording started");
        var downloadTimer = setInterval(function(){
        if(timeleft <= 0){
            clearInterval(downloadTimer);
            recordButton.innerHTML = "Record";
            stopRecording();
        } else {
            recordButton.innerHTML = timeleft + " seconds remaining";
        }
            timeleft -= 1;
        }, 1000);

    }).catch(function(err) {
        //enable the record button if getUserMedia() fails
        recordButton.disabled = false;

    });
}


function stopRecording() {
    console.log("stopButton clicked");

    recordButton.disabled = false;
    timeleft = 10;
    //tell the recorder to stop the recording
    rec.stop();

    //stop microphone access
    gumStream.getAudioTracks()[0].stop();

    //create the wav blob and pass it on to createDownloadLink
    rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {

    var filename = new Date().toISOString();
    var xhr=new XMLHttpRequest();
    xhr.onload=function(e) {
        if(this.readyState === 4) {
            //console.log("Server returned: ",e.target.responseText);
            document.getElementById('result').innerHTML = "Result: "+e.target.responseText;
        }
    };
    var fd=new FormData();
    fd.append("audio_data",blob, filename);
    xhr.open("POST","/",true);
    xhr.send(fd);

}