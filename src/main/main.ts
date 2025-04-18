/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import net from 'net';
import { randomBytes } from 'crypto';
import { Buffer } from 'node:buffer';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

enum Mode {
  WAIT_SIZE = 'wait_size',
  COLLECT_DATA = 'collect_data',
}

const streamDataConverter = (onPackage: (data: Buffer) => void) => {
  let bucket = Buffer.alloc(0);
  let mode: Mode = Mode.WAIT_SIZE;
  let totalSize = 0;
  const pushData = (data: Buffer) => {
    bucket = Buffer.concat([bucket, data]);

    const processChunk = () => {
      switch (mode) {
        case Mode.WAIT_SIZE:
          if (bucket.length >= 4) {
            totalSize = bucket.readUInt32BE(0);
            bucket = bucket.subarray(4);
            mode = Mode.COLLECT_DATA;
            processChunk();
          }
          break;

        case Mode.COLLECT_DATA:
          if (bucket.length >= totalSize) {
            console.log('package received', totalSize);
            const messageData = bucket.subarray(0, totalSize);
            bucket = bucket.subarray(totalSize);

            onPackage(messageData);
            mode = Mode.WAIT_SIZE;
            totalSize = 0;

            processChunk();
          }
          break;

        default:
          break;
      }
    };

    processChunk();
  };

  return { pushData };
};

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  const client = net.connect({ port: 3002 }, () => {
    const id = randomBytes(4);
    client.write(id);
    console.log('Connected to server');
  });

  const converter = streamDataConverter((completeData) => {
    const dataString = completeData.toString();
    console.log('Received complete message from server:', dataString);
    if (mainWindow) {
      mainWindow.webContents.send('server-message', dataString);
    }
  });

  client.on('data', (data) => {
    console.log('Received raw data from server');
    converter.pushData(data);
  });

  ipcMain.on('sender', (event, message) => {
    const payload = Buffer.from(message);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(payload.length, 0);
    const packet = Buffer.concat([header, payload]);
    client.write(packet);
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
