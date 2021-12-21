
const {net} = require('electron');
const {fetch} = require('electron-fetch');

const VixenStatusPath = '/api/play/Status';
const VixenGetControllersPath = '/api/system/getControllers';
const VixenPlayPath = '/api/play/playSequence';
const VixenActivateControllerPath = '/api/system/setControllerState';
const VixenGetSequences = '/api/play/getSequences';

let Hostname = "localhost";
let Port = "8888";

let active = false;

const controllers = [
    {
        "Id": "be1b17fb-2646-4b8c-8524-59d9a1120321",
        "Name": "Alphapix",
        "IsRunning": false,
        "IsPaused": false
    }
];


// play a sequence

function play(sequence, callback) {

    // need to activate all controllers before starting playback
    
    setActive(true, function(status) {

        if(status) {
            
            VixenPlayCall(sequence, function(response) {

                callback(response);

            });
        
        } else {
            callback(false);
        }

    });

}

exports.play = play;


// set the active state (isActive = true/false)

function setActive(isActive, callback) {

    active = isActive;

    // iterate through all available controllers and set their active state

    VixenGetControllers(function(controllers) {
        if(controllers && controllers.length) {
                
            controllers.forEach(function(controller) {
                VixenActivateController(controller.Id, isActive, function(response) {
                    callback(response);
                }); 
            }); 
        
        } else {
            callback(false);
        }   
    });

}

exports.setActive = setActive;


// get the current status from Vixen API

function getStatus(callback) {

    var returnObj = {
        status: 'idle'
    }
    
    VixenCall(VixenStatusPath, false, function(response) {

        if(response) {

            if(response.length > 0 && response[0].State == 1) {
                returnObj.status = 'playing';
            }
            callback(returnObj)

        } else {
            callback(false);
        }
    });
}

exports.getStatus = getStatus;

function getSequences(callback) {

    VixenCall(VixenGetSequences, false, function(sequences) {
        returnObj = [];
        sequences.forEach(function(sequence) {
            returnObj.push({
                player: 'vixen',
                sequence: {
                    name: sequence.Name,
                    data: sequence
                }
            });
        });
        callback(returnObj);
    });

}

exports.getSequences = getSequences;

// Helper functions

function VixenPlayCall(sequence, callback) {
    
    VixenCall(VixenPlayPath, sequence, function(response) {
        callback(response);
    });

}

function VixenGetControllers(callback) {

    VixenCall(VixenGetControllersPath, false, function(response) {
        callback(response);
    });

}

function VixenActivateController(controllerId, isActive, callback) {
    
    let responseObj = {
        success: false
    };

    var postData = {
        id: controllerId,
        isRunning: isActive
    }
    
    VixenCall(VixenActivateControllerPath, postData, function(response) {
        callback(response);
    });
}

function VixenStatusCall(callback) {

    VixenCall(VixenStatusPath, false, function(response) {
        callback(response);
    });

}

  
function VixenCall(path, postData, callback) {
    
    console.log('Calling:' + path);
    const request = net.request({
        method: postData ? 'POST' : 'GET', 
        url: 'http://' + Hostname + ':' + Port + path,
        headers: {
            'Content-Type': postData ? 'application/x-www-form-urlencoded;charset=UTF-8' : 'application/json'
        }
    });

    request.on('response', (response) => {
          
      let bodyText = '';
    
      response.on('data', (chunk) => {
          bodyText += chunk;
      });
      
      response.on("end", async () => {

        // console.log(bodyText);
        var body = JSON.parse(bodyText);                  
        callback(body);

      });
    });

    request.on('abort', () => {
        console.log('Request is Aborted')
        callback(false);
    });

    request.on('error', (error) => {
        console.log(`ERROR: ${JSON.stringify(error)}`)
        callback(false);
    });


    if(postData) {
        var formBody = [];
        for (var property in postData) {
            var encodedKey = encodeURIComponent(property);
            var encodedValue = encodeURIComponent(postData[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");
        request.write(formBody);
    }

    request.end();
  };

