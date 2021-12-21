
const {net} = require('electron');
const fetch = require('node-fetch')

const XlightsStatusPath = '/xScheduleQuery?Query=GetPlayingStatus&Parameters=';
const XlightsPlayPath = '/xScheduleCommand?Command=Play playlist step&Parameters=';
const XlightsToggleLights = '/xScheduleCommand?Command=Toggle output to lights';
const XlightsGetPlayListsPath = "/xScheduleQuery?Query=GetPlayLists&Parameters=";
const XlightsGetStepsPath = "/xScheduleQuery?Query=GetPlayListSteps&Parameters=";

let Hostname = "localhost";
let Port = "8000";

let active = false;

function play(sequence, callback) {

    setActive(true, function(status) {

        XlightsPlayCall(sequence, function(response) {

            callback(response);

        });

    });

}

exports.play = play;

// in Xlights setting active / deactive is as simple as turning off the "send to lights" parameter

function setActive(isActive, callback) {

    active = isActive;

    XlightsStatusCall(function(status) {

        // console.log(status);

        if((isActive && status.active == 'false') || (!isActive && status.active == 'true')) {
            
            XlightsToggleLightsCall(function(status){
                callback(status);
            });            
        } else {
            callback(status);
        }
    
    });
}

exports.setActive = setActive;


function XlightsPlayCall(sequence, callback) {

    
    XlightsCall(XlightsPlayPath + "id:" + sequence.showid + ",id:" + sequence.stepid, function(response) {
        
        XlightsStatusCall(function(status) {
            callback(status);
        });

    });

}

function XlightsToggleLightsCall(callback) {

    XlightsCall(XlightsToggleLights, function(response) {
        XlightsStatusCall(function(status) {
            callback(status);
        });
    });

}

function XlightsStatusCall(callback) {
    
    XlightsCall(XlightsStatusPath, function(response) {
        callback(response);
    });

};

exports.getStatus = XlightsStatusCall;


function getSequences(callback) {

    console.log('getting xlights sequences');
    XlightsCall(XlightsGetPlayListsPath, function(response) {

        if(response && response.playlists) {
                
            getShows(response.playlists).then((sequences) => {

                console.log('Xlights sequences: ' , sequences);
                var returnObj = [];
                sequences.forEach(function(sequence) {
                    returnObj.push({
                        player: 'xlights',
                        sequence: {
                            name: sequence.name,
                            data: sequence
                        }
                    });
                });
                callback(returnObj);
            });

        } else {
            callback(false);
        }

    });

}

async function getShows(playlists) {

    var retObj = [];
    for (idx in playlists) {
        /*XlightsCall(XlightsGetStepsPath + show.name, false, function(showResponse) {
            callback(showResponse ? showResponse.steps : false);
        });*/
        const res = await fetch('http://' + Hostname + ':' + Port + XlightsGetStepsPath + playlists[idx].name);  // have to do this for async
        const json = await res.json()
        if(json.steps) {
            retObj.push(...json.steps);
        }
//       console.log(retObj);
    };
    return retObj;

}

exports.getSequences = getSequences;

function XlightsCall(path, callback) {

    console.log('Calling: ' + path);
    const netConfig = {
        method: 'GET', 
        url: 'http://' + Hostname + ':' + Port + path,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const request = net.request(netConfig);

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

    request.end();
  };