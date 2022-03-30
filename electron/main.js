const isDev = require('electron-is-dev');
const path = require('path');
const url = require('url');
const {app, BrowserWindow, ipcMain, ipcRenderer, globalShortcut} = require('electron');
const { Readable } = require('stream');
if(!isDev) {
    var Gpio = require('onoff').Gpio;
    var reverseButton = new Gpio(4, 'in', 'both');
}
const WebSocket = require('ws');
const mp4Reader = new Readable({
    read(size) {
    }
});
const Carplay = require('node-carplay')
// const bindings = ['n', 'v', 'b', 'm', ]
// const keys = require('./bindings.json')
let wss;
wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', function connection(ws) {
    console.log('Socket connected. sending data...');
    const wsstream = WebSocket.createWebSocketStream(ws);
    //lets pipe into jmuxer stream, then websocket
    mp4Reader.pipe(wsstream);
    ws.on('error', function error(error) {
        console.log('WebSocket error');
    });
    ws.on('close', function close(msg) {
        console.log('WebSocket close');
    });
});

let mainWindow;

function createWindow() {
    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '../index.html'),
        protocol: 'file:',
        slashes: true,
    });

    globalShortcut.register('f5', function () {
        console.log('f5 is pressed')
        mainWindow.webContents.openDevTools()
    })

    mainWindow = new BrowserWindow({
        width: 800, height: 480, kiosk: !isDev, webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: false
        }
    });
    mainWindow.loadURL(startUrl);
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    const config = {
        dpi: 240,
        nightMode: 0,
        hand: 0,
        boxName: 'nodePlay',
        width: 800,
        height: 480,
        fps: 60,
    }
    console.log("spawning carplay", config)
    const carplay = new Carplay(config, mp4Reader)
    carplay.on('status', (data) => {
        if(data.status) {
            mainWindow.webContents.send('plugged')
        } else {
            mainWindow.webContents.send('unplugged')
        }
        console.log("carplay data received", data)

    })
    ipcMain.on('click', (event, data) => {
        carplay.sendTouch(data.type, data.x, data.y)
        console.log(data.type, data.x, data.y)
    })
    ipcMain.on('statusReq', (event, data) => {
        if(carplay.getStatus()) {
            mainWindow.webContents.send('plugged')
        } else {
            mainWindow.webContents.send('unplugged')
        }
    })
    if(!isDev) {
        reverseButton.watch((err, value) => { 
            mainWindow.webContents.send('reverseSwitch', value)
        })
    }
    let sdf = 0
    setInterval(() => {
        mainWindow.webContents.send('reverseSwitch', sdf)
        sdf++
    }, 2000)

    // for (const [key, value] of Object.entries(keys)) {
    //     globalShortcut.register(key, function () {
    //         carplay.sendKey(value)
	//     if(value==="selectDown"){
	//         setTimeout(()=>{
	// 	   carplay.sendKey("selectUp")
	// 	}, 200)
	//     }
    //     })
    // }

}

app.on('ready', createWindow);
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});



