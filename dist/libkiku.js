/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const kikuaudiostream_1 = __webpack_require__(1);
/**
 * @class Kiku
 */
class Kiku {
    /**
     * @method setup
     * @static
     * @public
     */
    static setup() {
        Kiku.peerConnStack = new Array(0);
        Kiku.activeConn = 0;
        if (window.Peer !== undefined) {
            Kiku.peerjs = window.Peer;
        }
        kikuaudiostream_1.KikuAudioStream.setup();
        kikuaudiostream_1.KikuAudioStream.listenForStart(Kiku.onStartRecording);
    }
    /**
     * @method connectToServer
     * @static
     * @public
     * @param name : Name of the peer on this device
     * @param serverAddr : Server IP location
     * @param serverPort : Server port
     * @param serverPath : Peerjs server path
     */
    static connectToServer(name, serverAddr, serverPort, serverPath, secure) {
        // Setup properties
        Kiku.myname = name;
        Kiku.serverAddr = serverAddr;
        Kiku.serverPort = serverPort;
        Kiku.serverPath = serverPath;
        if (secure === undefined) {
            secure = false;
        }
        // Format for peerjs
        let serverInfo = {
            host: Kiku.serverAddr,
            port: Kiku.serverPort,
            path: Kiku.serverPath,
            secure: secure
        };
        // Connect to server
        Kiku.peer = new Kiku.peerjs(Kiku.myname, serverInfo);
        // Assign callbacks to peer object
        Kiku.peer.on('connection', (conn) => {
            Kiku.onConnectionCallback(conn);
            conn.on('data', (message) => {
                Kiku.onDataCallback(conn, message);
            });
        });
    }
    /**
     * @method connectToDevice
     * @static
     * @public
     * @param deviceName
     */
    static connectToDevice(deviceName) {
        // Connect to peer
        let peerConn = Kiku.peer.connect(deviceName);
        // Setup callbacks before adding to the stack
        peerConn.on('open', () => {
            peerConn.on('data', (message) => {
                Kiku.onDataCallback(peerConn, message);
            });
        });
        // Add onto the connection stack
        Kiku.peerConnStack.push(peerConn);
    }
    /**
     * @method sendEmptyResponse
     * @param deviceName : Name of device to send message to
     */
    static sendEmptyResponse(deviceName) {
        let stackIndex = Kiku.findIndexOfDevice(deviceName);
        if (stackIndex !== -1) {
            let message = new MessageData(MessageType.REQUEST_EMPTY_RESPONSE);
            if (Kiku.peerConnStack[stackIndex].open) {
                Kiku.ourNetworkTime = Kiku.currentTime();
                PeerConnection.sendData(Kiku.peerConnStack[stackIndex], message);
            }
            else {
                console.warn('Connection to peer was not open to send the data via!');
            }
        }
        else {
            console.warn('No peer with that ID was found in the active connection stack!');
        }
    }
    /**
     * @method startRecording
     * @static
     * @public
     * @param deviceName : Device to request synchronized recording
     * @param fromNow : Number of miliseconds to start from now
     */
    static async startRecording(deviceName, fromNow, allowanceTime) {
        if (allowanceTime !== undefined) {
            Kiku.flightAllowanceTime = allowanceTime;
        }
        Kiku.currentMaster = true;
        Kiku.inRecordingFlight = true;
        Kiku.activeConn = Kiku.findIndexOfDevice(deviceName);
        let timeStamp = performance.timeOrigin + performance.now() + fromNow;
        let stackIndex = Kiku.findIndexOfDevice(deviceName);
        if (stackIndex !== -1) {
            let message = new MessageData(MessageType.REQUEST_RECORD, timeStamp);
            console.log('Sending start record message', message);
            if (Kiku.peerConnStack[stackIndex].open)
                PeerConnection.sendData(Kiku.peerConnStack[stackIndex], message);
            else {
                console.warn('Connection to peer was not open to send the data via!');
            }
        }
        else {
            console.warn('No peer with that ID was found in the active connection stack!');
        }
        let buffer = await kikuaudiostream_1.KikuAudioStream.recordAt(timeStamp, Kiku.recordDuration);
        Kiku.ourBuffer = buffer;
        Kiku.currentMaster = false;
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Kiku.inRecordingFlight) {
                    reject('Recording was still in flight and was not transfered back to this device in time');
                }
                else {
                    let results = {
                        currentDeviceBuffer: Kiku.ourBuffer,
                        requestedDeviceBuffer: new Float32Array(Kiku.theirBuffer),
                        recordingDelay: Kiku.recordingDelayTime,
                        networkDelay: Kiku.networkDelayTime
                    };
                    resolve(results);
                }
            }, Kiku.flightAllowanceTime);
        });
    }
    /**
     * @method sendRecordedBuffer
     * @static
     * @public
     * @param deviceName : Device to send recorded buffer to
     * @param buffer : Audio buffer to send
     */
    static sendRecordedBuffer(deviceName, buffer) {
        let stackIndex = Kiku.findIndexOfDevice(deviceName);
        if (stackIndex !== -1) {
            let message = new MessageData(MessageType.RESPONSE_RECORD, Kiku.currentTime(), buffer);
            if (Kiku.peerConnStack[stackIndex].open)
                PeerConnection.sendData(Kiku.peerConnStack[stackIndex], message);
            else {
                console.warn('Connection to peer was not open to send the data via!');
            }
        }
        else {
            console.warn('No peer with that ID was found in the active connection stack!');
        }
    }
    /**
     * @method onStartRecording
     * @static
     * @private
     */
    static onStartRecording() {
        if (Kiku.currentMaster !== true) {
            console.log('onStartRecording entering send message');
            let message = new MessageData(MessageType.STARTED_RECORDING);
            if (Kiku.peerConnStack[Kiku.activeConn].open) {
                Kiku.ourRecordingStart = Kiku.currentTime();
                console.log('Sending message of start recording', message);
                PeerConnection.sendData(Kiku.peerConnStack[Kiku.activeConn], message);
            }
            else {
                console.warn('Connection to peer was not open to send the data via!');
            }
        }
    }
    /**
     * @method setReturnAllowance
     * @static
     * @public
     * @param allowance : Return time allowance before timeout when waiting for other device buffer
     */
    static setReturnAllowance(allowance) {
        Kiku.flightAllowanceTime = allowance;
    }
    /**
     * @method deleteUnusedConnections
     * @static
     * @public
     */
    static deleteUnusedConnections() {
        for (let index = 0; index < Kiku.peerConnStack.length; index++) {
            if (!Kiku.peerConnStack[index].open) {
                Kiku.peerConnStack.splice(index, 1);
            }
        }
    }
    /**
     * @method findIndexOfDevice
     * @static
     * @private
     * @param deviceName : Device id to search in the connection stack
     */
    static findIndexOfDevice(deviceName) {
        for (var index = 0; index < Kiku.peerConnStack.length; index++) {
            if (Kiku.peerConnStack[index].peer === deviceName) {
                return index;
            }
        }
        return -1;
    }
    /**
     * @method onDataCallback
     * @static
     * @private
     * @param conn : Peerjs connection to pass in
     * @param message : Message received on the connection
     */
    static onDataCallback(conn, message) {
        console.log('message received:', message);
        switch (message.type) {
            case (MessageType.REQUEST_EMPTY_RESPONSE):
                let emptyResponse = new MessageData(MessageType.RESPONSE_EMPTY_RESPONSE);
                Kiku.ourNetworkTime = Kiku.currentTime();
                PeerConnection.sendData(conn, emptyResponse);
                break;
            case (MessageType.REQUEST_RECORD):
                console.log('Asked to start recording...');
                kikuaudiostream_1.KikuAudioStream.recordAt(message.timeStamp, Kiku.recordDuration).then((buffer) => {
                    console.log('Successfully completed recording!');
                    this.sendRecordedBuffer(conn.peer, buffer);
                });
                break;
            case (MessageType.STARTED_RECORDING):
                Kiku.theirRecordingStart = Kiku.currentTime();
                Kiku.updateRecordingDelayTime();
                break;
            case (MessageType.RESPONSE_EMPTY_RESPONSE):
                Kiku.theirNetworkTime = Kiku.currentTime();
                Kiku.updateNetworkDelayTime();
                break;
            case (MessageType.RESPONSE_RECORD):
                Kiku.theirBuffer = message.audioBuffer;
                Kiku.inRecordingFlight = false;
                break;
        }
        ;
    }
    ;
    /**
     * @method onConnectionCallback
     * @static
     * @private
     * @param conn : Peerjs connection
     */
    static onConnectionCallback(conn) {
        console.log('Connection received!', conn);
        Kiku.peerConnStack.push(conn);
    }
    /**
     * @method onOpenCallback
     * @static
     * @private
     */
    static onOpenCallback() {
        console.log('Connection open!');
    }
    /**
     * @method currentTime
     * @static
     * @private
     */
    static currentTime() {
        return performance.timing.navigationStart + performance.now();
    }
    /**
     * @method updateNetworkDelayTime
     * @static
     * @private
     */
    static updateNetworkDelayTime() {
        Kiku.ourNetworkTime = Kiku.ourNetworkTime || performance.now();
        Kiku.theirNetworkTime = Kiku.theirNetworkTime || Kiku.ourNetworkTime;
        Kiku.networkDelayTime = Math.abs(Kiku.ourNetworkTime - Kiku.theirNetworkTime) / 2;
    }
    /**
     * @method updateRecordingDelayTime
     * @static
     * @private
     */
    static updateRecordingDelayTime() {
        Kiku.recordingDelayTime = Math.abs(Kiku.ourRecordingStart - Kiku.theirRecordingStart) / 2000;
    }
}
Kiku.activeConn = 0;
Kiku.flightAllowanceTime = 1000;
Kiku.networkDelayTime = 10;
Kiku.recordingDelayTime = 0;
Kiku.ourRecordingStart = Kiku.currentTime();
Kiku.theirRecordingStart = Kiku.ourRecordingStart;
Kiku.recordDuration = 1000;
Kiku.buffersReady = false;
Kiku.ourBuffer = new Float32Array(1);
Kiku.theirBuffer = new Float32Array(1);
Kiku.inRecordingFlight = false;
Kiku.currentMaster = false;
/**
 * @class PeerConnection
 */
class PeerConnection {
    /**
     * @method sendData
     * @static
     * @public
     * @param conn : Peerjs connection object
     * @param messageData : MessageData object with data to send
     */
    static sendData(conn, messageData) {
        let message = {
            type: messageData.type,
            timeStamp: messageData.timeStamp || '',
            audioBuffer: messageData.audioBuffer || ''
        };
        if (conn.open) {
            conn.send(message);
        }
        else {
            console.warn('Tried to send message when connection is closed!', message);
        }
    }
}
/**
 * @class MessageData
 */
class MessageData {
    /**
     * @constructor
     * @param messageType : Message type to send of type enum MessageType
     * @param timeStamp : Timing information related to the message
     * @param audioBuffer : Audio buffer to send
     */
    constructor(messageType, timeStamp, audioBuffer) {
        this.type = messageType;
        this.timeStamp = timeStamp;
        this.audioBuffer = audioBuffer;
    }
    /**
     * @method toObject
     * @public
     */
    toObject() {
        return {
            messageType: this.type,
            timeStamp: this.timeStamp || [],
            audioBuffer: this.audioBuffer || []
        };
    }
}
/**
 * @enum MessageType
 */
var MessageType;
(function (MessageType) {
    MessageType["REQUEST_RECORD"] = "requestRecord";
    MessageType["RESPONSE_RECORD"] = "responseRecord";
    MessageType["STARTED_RECORDING"] = "startedRecording";
    MessageType["STOPPED_RECORDING"] = "stoppedRecording";
    MessageType["REQUEST_EMPTY_RESPONSE"] = "requestEmptyResponse";
    MessageType["RESPONSE_EMPTY_RESPONSE"] = "responseEmptyResponse";
})(MessageType || (MessageType = {}));
// Assign to window for easy JS startup
window.Kiku = Kiku;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @class KikuAudioStream
 */
class KikuAudioStream {
    /**
     * @method setup
     * @static
     * @public
     */
    static setup() {
        KikuAudioStream.audioContext = new AudioContext() || window.webkitAudioContext();
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            console.log('getUserMedia supported.');
            navigator.mediaDevices.getUserMedia({
                "audio": {
                    "mandatory": {
                        "googEchoCancellation": "false",
                        "googAutoGainControl": "false",
                        "googNoiseSuppression": "false",
                        "googHighpassFilter": "false"
                    },
                    "optional": []
                }
            }) // Request permissions
                // Success callback
                .then(function (stream) {
                KikuAudioStream.setupStream(stream);
            })
                // Error callback
                .catch(function (err) {
                console.warn('The following getUserMedia error occured: ' + err);
            });
        }
        else { // Media devices weren't available
            console.warn('getUserMedia not supported on your browser!');
        }
    }
    /**
     * @method listenForStart
     * @static
     * @public
     * @param callback : Callback to call on the start of recording
     */
    static listenForStart(callback) {
        this.startedRecording = callback;
    }
    /**
     * @method listenForEnd
     * @static
     * @public
     * @param callback : Callback to call on the end of recording
     */
    static listenForEnd(callback) {
        this.finishedRecording = callback;
    }
    /**
     * @method float32bufferConcat
     * @static
     * @private
     * @param buffer0
     * @param buffer1
     */
    static float32bufferConcat(buffer0, buffer1) {
        let item0Length = buffer0.length;
        let result = new Float32Array(item0Length + buffer1.length);
        result.set(buffer0);
        result.set(buffer1, item0Length);
        return result;
    }
    /**
     * @method setupStream
     * @static
     * @private
     * @param stream : Media stream to setup audio recording
     */
    static setupStream(stream) {
        // Update stream info
        KikuAudioStream.supported = true;
        this.micRecorder = new MediaRecorder(stream);
        // Create live audio context processing
        KikuAudioStream.scriptNode = KikuAudioStream.audioContext.createScriptProcessor(1024, 1, 1);
        KikuAudioStream.mediaStreamSourceNode = KikuAudioStream.audioContext.createMediaStreamSource(stream);
        // Callback for script processor function
        KikuAudioStream.scriptNode.onaudioprocess = function (event) {
            // Add onto recorded data when set to true
            if (KikuAudioStream.isRecording) {
                KikuAudioStream.activeBuffer = KikuAudioStream.float32bufferConcat(KikuAudioStream.activeBuffer, event.inputBuffer.getChannelData(0));
            }
            else {
                if (KikuAudioStream.resetAudioBuffer === true) {
                    // Reset memory for garbage collection
                    KikuAudioStream.activeBuffer = new Float32Array(1);
                    KikuAudioStream.resetAudioBuffer = false;
                }
            }
        };
        // Connect source to script processor
        KikuAudioStream.mediaStreamSourceNode.connect(KikuAudioStream.scriptNode);
        KikuAudioStream.scriptNode.connect(KikuAudioStream.audioContext.destination);
    }
    /**
     * @method recordAt
     * @static
     * @public
     * @param time : Time to start recording at (unix time)
     * @param duration : Duration to record for (ms)
     */
    static async recordAt(time, duration) {
        // Reset buffer before attempting to record
        KikuAudioStream.clearAudioBuffer();
        // Estimate execution time
        let eta_ms = time - KikuAudioStream.currentTime();
        console.log('Starting to record in ' + eta_ms + ' from now (' + eta_ms / 1000 + ')');
        // Declare callback until execution time
        let waitUntil = () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    KikuAudioStream.record(duration).then((recording) => {
                        resolve(recording);
                    });
                }, eta_ms);
            });
        };
        // Wait until execution time
        let recording = await waitUntil();
        // Return recorded buffer
        return recording;
    }
    /**
     * @method record
     * @static
     * @public
     * @param duration : Length to record for (ms)
     */
    static record(duration) {
        return new Promise((resolve) => {
            // Set record atomic boolean true
            KikuAudioStream.isRecording = true;
            // Notify listeners
            KikuAudioStream.startedRecording();
            // Timeout until finish
            setTimeout(() => {
                KikuAudioStream.isRecording = false;
                KikuAudioStream.recordedBuffer = KikuAudioStream.activeBuffer;
                resolve(KikuAudioStream.recordedBuffer);
            }, duration);
        });
    }
    /**
     * @method recording
     * @static
     * @public
     */
    static recording() {
        return KikuAudioStream.isRecording;
    }
    /**
     * @method getLastRecordedBuffer
     * @static
     * @public
     */
    static getLastRecordedBuffer() {
        return KikuAudioStream.recordedBuffer;
    }
    /**
     * @method currentTime
     * @static
     * @private
     */
    static currentTime() {
        return performance.timing.navigationStart + performance.now();
    }
    static clearAudioBuffer() {
        KikuAudioStream.resetAudioBuffer = true;
    }
}
KikuAudioStream.isRecording = false;
KikuAudioStream.activeBuffer = new Float32Array(1);
KikuAudioStream.recordedBuffer = new Float32Array(1);
KikuAudioStream.startedRecording = () => { };
KikuAudioStream.finishedRecording = () => { };
KikuAudioStream.audioContext = new AudioContext();
KikuAudioStream.supported = false;
KikuAudioStream.resetAudioBuffer = false;
exports.KikuAudioStream = KikuAudioStream;


/***/ })
/******/ ]);