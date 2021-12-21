const {app, net, BrowserWindow, ipcMain} = require('electron')
const xlights = require('./xlights');
const vixen = require('./vixen');
const path = require('path');

let state = 'stopped';
let checkTimer = false;

var config = {
    network: {
        vixenHost: "localhost",
        vixenPort: "8888",
        xlightsHost: "localhost",
        xlightsPort: "8000"
    },
    schedules: [
        {
            daysOfWeek: [1,2,3,4,5,6,7],
            start: "17:00",
            end: "22:00",
            playlistId: "Default"
        }
    ],
    playlists: [{
        id: "Default",
        sequences: [
            {
                player: 'xlights',
                sequence: {
                     "name": "Jingle Bells",
                     "data": {
                         "showid": 1,
                         "stepid": 0
                     }
                }
             },
             {
                player: 'vixen',
                sequence:  {
                    "name": "Second",
                    "data": {
                         "Name": "Second",
                         "FileName": "C:\\Users\\Owner\\OneDrive\\Documents\\Vixen 3\\Sequence\\Second.tim"
                    }
                }
             },
             {
                player: 'vixen',
                sequence:  {
                    "name": "First",
                    "data": {
                         "Name": "First",
                         "FileName": "C:\\Users\\Owner\\OneDrive\\Documents\\Vixen 3\\Sequence\\First.tim"
                    }
                }
             }
        ]
    }]
}

var playlist = [
    {
       player: 'xlights',
       sequence: {
            "name": "Jingle Bells",
            "data": {
                "showid": 1,
                "stepid": 0
            }
       }
    },
    {
       player: 'vixen',
       sequence:  {
           "name": "Second",
           "data": {
                "Name": "Second",
                "FileName": "C:\\Users\\Owner\\OneDrive\\Documents\\Vixen 3\\Sequence\\Second.tim"
           }
       }
    },
    {
       player: 'vixen',
       sequence:  {
           "name": "First",
           "data": {
                "Name": "First",
                "FileName": "C:\\Users\\Owner\\OneDrive\\Documents\\Vixen 3\\Sequence\\First.tim"
           }
       }
    }
 ];

 var currIndex = 0;

 
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
  
  ipcMain.on('play-next', (e) => {
    currIndex = (currIndex + 1) % config.playlists[0].sequences.length;
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
        state = 'stopping';
    } else {;
        state = 'stopped';
        // stop current sequence
    }
    
  });

  ipcMain.on('get-status', (e) => {

    GetStatus(function(response) {
                
        e.sender.send('get-status-reply', response);
        
    })

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

  ipcMain.on('playlist', (e) => {
    e.sender.send('playlist-reply', playlist);
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


function CheckStatus() {

    clearTimeout(checkTimer);
    GetStatus(function(response) {

        console.log('Check Status Result:', response);

        if(response.status == 'waiting' && state == 'playing') {            
            currIndex = (currIndex + 1) % config.playlists[0].sequences.length;
            PlayIndex(currIndex, function() {

            });
            checkTimer = setTimeout(CheckStatus, 5000);
        }

        if(state != 'stopped') {
            checkTimer = setTimeout(CheckStatus, 1000);
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

        if(response && response.status == 'playing') {
            state = 'playing';
            responseObj.status = 'playing';
            responseObj.currIndex = currIndex;
            responseObj.sequenceName = config.playlists[0].sequences[currIndex].sequence.name;
            responseObj.xlights.status = 'playing';
        } 

        vixen.getStatus(function(response) {

            if(response) {
                if(response.status == 'playing') {
                    state = 'playing';
                    responseObj.status = 'playing';
                    responseObj.vixen.status = 'playing';
                    responseObj.currIndex = currIndex;
                    responseObj.sequenceName = config.playlists[0].sequences[currIndex].sequence.name;
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

    state = 'loading';
    var item = config.playlists[0].sequences[idx];
    if(item) {
        switch(item.player) {
            case "xlights":

                console.log('Turning off vixen.');
                vixen.setActive(false, function(status) {
                    console.log('Playing sequence ' + idx + ' on Xlights');
                    xlights.play(item.sequence.data, function(response) {
                        callback(response);
                    });
                });
                break;
            case "vixen":
                console.log('Turning off Xlights.');
                xlights.setActive(false, function(status) {
                    console.log('Playing sequence ' + idx + ' on Vixen');
                    vixen.play(item.sequence.data, function(response) {
                        callback(response);
                    });
                });
                break;
        }
    }
}
  