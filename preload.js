// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

// Preload (Isolated World)
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
  'bridge',
  {
    on (eventName, callback) {
      ipcRenderer.on(eventName, callback)
    },
    getStatus: () => ipcRenderer.send('get-status'),
    getXlightsStatus: () => ipcRenderer.send('xlights-status'),
    getVixenStatus: () => ipcRenderer.send('vixen-status'),
    getPlaylist: () => ipcRenderer.send('get-playlist'),
    savePlaylist: (playlist) => ipcRenderer.send('save-playlist', playlist),
    getSchedules: () => ipcRenderer.send('get-schedules'),
    saveSchedules: (schedule) => ipcRenderer.send('save-schedules', schedule),
    setXlightsActive: (isActive) => ipcRenderer.send('xlights-active', isActive),
    play: (idx) => ipcRenderer.send('play', idx),
    playNext: () => ipcRenderer.send('play-next'),
    getXlightsSequences: () => ipcRenderer.send('get-sequences-xlights'),
    getVixenSequences: () => ipcRenderer.send('get-sequences-vixen')
  }
)
