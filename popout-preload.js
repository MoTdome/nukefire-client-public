'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('nukefirePanel', {
  ready: (panelId) => ipcRenderer.invoke('panel:ready', panelId),
  resize: (request) => ipcRenderer.invoke('panel:resize', request),
  action: (request) => ipcRenderer.invoke('panel:action', request),
  onState: (callback) => subscribe('panel:state', callback),
  onBounds: (callback) => subscribe('panel:bounds', callback)
});
