const {app, net, BrowserWindow, ipcMain} = require('electron')
const storage = require('electron-json-storage');

const xlights = require('./xlights');
const vixen = require('./vixen');
const path = require('path');

let CONFIG, PLAYLIST, SCHEDULE = false;
let STATE = 'stopped';

let checkTimer = false;
var currIndex = 0;
var currPlaylist = false;
var currSchedule = false;


var config = {
    network: {
        vixenHost: "localhost",
        vixenPort: "8888",
        xlightsHost: "localhost",
        xlightsPort: "8000"
    },
    schedules: [
        {
            daysOfWeek: [1,3,5,6,0],
            start: "15:00",
            end: "22:00",
            playlistId: "Default",
            enabled: false
        }
    ]
}
 
function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {


    createWindow();

    Init();

    ipcMain.on('play-next', (e) => {
        currIndex = (currIndex + 1) % currPlaylist.length;
        PlayIndex(currIndex, function(response) {
            e.sender.send('play-reply', response);
            CheckStatus();
        });
    });

    ipcMain.on('play', (e, idx) => {
        console.log('Playing sequence.');
        PlayIndex(idx, function(response) {
            e.sender.send('play-reply', response);
            CheckStatus();
        });
    });

  
  ipcMain.on('stop', (e, graceful) => {
    console.log('Stopping sequence.');

    if(graceful) {
        STATE = 'stopping';
    } else {;
        STATE = 'stopped';
        // stop current sequence
    }
    
  });

  ipcMain.on('get-status', (e) => {

    GetStatus(function(response) {
                
        e.sender.send('get-status-reply', response);
        
    })

  });

  ipcMain.on('get-schedules', (e) => {

    var schedules = storage.getSync('xv-scheduler-schedules');
    if(schedules && schedules[0]) {
        currSchedule = schedules[0];
    }
    e.sender.send('get-schedules-reply', schedules);

  });

  ipcMain.on('save-schedules', (e, schedules) => {
    
    storage.set('xv-scheduler-schedules', schedules, function(error) {
        e.sender.send('save-schedules-reply', error);
    });

    if(schedules && schedules[0]) {
        if(schedules[0].enabled) {
            if(STATE != 'playing') {
                STATE = 'waiting';
            } 
        } else {
            STATE = 'stopped';
        }
        currSchedule = schedules[0];
    }

    CheckStatus();

  });


  ipcMain.on('get-playlist', (e) => {
    currPlaylist = storage.getSync('xv-scheduler-playlist');
    e.sender.send('get-playlist-reply', currPlaylist);
  });

  ipcMain.on('save-playlist',(e, playlist) => {
    currPlaylist = playlist;
    storage.set('xv-scheduler-playlist', playlist, function(error) {
        e.sender.send('save-playlist-reply', error);
    });

  });



  ipcMain.on('get-sequences-xlights', (e) => {

    xlights.getSequences(function(xlightsSequences) {

        e.sender.send('get-sequences-xlights-reply', xlightsSequences);
    });

  });

  ipcMain.on('get-sequences-vixen', (e) => {
    
    vixen.getSequences(function(vixenSequences) {

        e.sender.send('get-sequences-vixen-reply', vixenSequences);

    });

  });

  ipcMain.on('xlights-status', (e) => {
    // console.log('got an IPC message', e);
    console.log('Checking xlights status.');
    xlights.getStatus(function(response) {
        e.sender.send('xlights-status-reply', response);
    });

  });

  ipcMain.on('xlights-active', (e, isActive) => {

    console.log('Setting xlights to active = ' + isActive);
    xlights.setActive(isActive, function(response) {
        e.sender.send('xlights-active-reply', response);
    })

  });

  ipcMain.on('vixen-status', (e) => {
    console.log('Checking vixen status.');
    
    vixen.getStatus(function(response) {
        e.sender.send('vixen-status-reply', response);
    });

  });


  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()

  });

  
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

function Init() {
    
    CONFIG = storage.getSync('xv-scheduler-config');
    PLAYLIST = storage.getSync('xv-scheduler-playlist');
    SCHEDULE = storage.getSync('xv-scheduler-schedule');
    console.log('local settings:',CONFIG, PLAYLIST, SCHEDULE);

    
    var schedules = storage.getSync('xv-scheduler-schedules');
    if(schedules && schedules[0]) {
        currSchedule = schedules[0];
    }

    CheckStatus();

}

function SavePlaylist(playlist, callback) {

}

function CheckStatus() {

    clearTimeout(checkTimer);

    if(STATE == 'loading') {
        loadingTimes++;

        if(loadingTimes > 10) {
            STATE = 'playing';
        }
    }

    GetStatus(function(response) {

        console.log('Current Response State:', response.status);
        console.log('Current State:', STATE);

        if(response.status == 'playing' && STATE == 'loading') {
            STATE = 'playing';
        }

        if(currSchedule.enabled) {

            if(STATE == 'stopped') {
                STATE = 'waiting';
            }

            var d = new Date();
            var todayIndex = d.getDay();
            var todayTime = d.toLocaleTimeString('en-GB');
            console.log(todayTime);

            if(currSchedule.daysOfWeek.includes(todayIndex)) {

                if(todayTime > currSchedule.start + ":00" && todayTime < currSchedule.end + ":00") {

                    if(STATE == 'waiting') {
                        STATE = 'starting';
                    } 
                } else {
                    STATE = 'waiting';
                }

            } else {
               STATE = 'waiting';
            }

        
        }



        if(response.status == 'waiting' && (STATE == 'playing' || STATE == 'starting')) {

            if(STATE == 'playing') {
                currIndex = (currIndex + 1) % currPlaylist.length;
            } else {
                currIndex = 0;
            }

            STATE = 'loading';
            loadingTimes = 0;

            PlayIndex(currIndex, function() {
                checkTimer = setTimeout(CheckStatus, 10000);
            });
        } else {

            if(STATE != 'stopped') {
                checkTimer = setTimeout(CheckStatus, 1000);
            }

        }


    });

}

function GetStatus(callback) {
    xlights.getStatus(function(response) {
        
        var responseObj = {
            status: 'waiting',
            xlights: {
                status: 'idle'
            },
            vixen: {
                status: 'idle'
            }
        }

        if(!response) {
            responseObj.xlights.errorMsg = 'Xlights status call failed.  Please make sure you have the correct host and port configured and your Xlights app is running.';
            responseObj.xlights.status = 'error';
         }

        if(response && response.status == 'playing' && currPlaylist && currPlaylist[currIndex]) {
            responseObj.status = 'playing';
            responseObj.currIndex = currIndex;
            responseObj.sequenceName = currPlaylist[currIndex].sequence.name;
            responseObj.xlights.status = 'playing';
        } 

        vixen.getStatus(function(response) {

            if(response) {
                if(response.status == 'playing') {
                    responseObj.status = 'playing';
                    responseObj.vixen.status = 'playing';
                    responseObj.currIndex = currIndex;
                    responseObj.sequenceName = currPlaylist[currIndex].sequence.name;
                }
            } else {
                responseObj.vixen.errorMsg = 'Vixen status call failed.  Please make sure you have the correct host and port configured and your Vixen app is running.';
                responseObj.vixen.status = 'error';
            }
            callback(responseObj);
            
        });
        
    });
}

// Start playing at a certain index in the current playlist
// FYI: xlights and vixen need to be deactivated before playing on the other software so that they don't interfere with each other

function PlayIndex(idx, callback) {

    var item = storage.getSync('xv-scheduler-playlist')[idx];
    if(item) {
        switch(item.player) {
            case "xlights":

                console.log('Turning off vixen.');
                vixen.setActive(false, function(status) {
                    if(status) {
                        console.log('Playing sequence ' + idx + ' on Xlights');
                        xlights.play(item.sequence.data, function(response) {

                            callback(response);
                        });
                    }
                });
                break;
            case "vixen":
                console.log('Turning off Xlights.');
                xlights.setActive(false, function(status) {
                    if(status) {
                        console.log('Playing sequence ' + idx + ' on Vixen');
                        vixen.play(item.sequence.data, function(response) {
                            STATE = 'playing';
                            callback(response);
                        });
                    }
                });
                break;
        }
    }
}
  