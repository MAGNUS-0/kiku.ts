import { KikuAudioStream } from './kikuaudiostream';

/**
 * @class Kiku
 */
class Kiku {

    static myname?: string;
    static serverAddr?: string;
    static serverPort?: string;
    static serverPath?: string;
    static peerjs?: any;
    static peer?: any;
    static peerConnStack: any[];
    static activeConn: number = 0;
    static flightAllowanceTime: number = 1000;

    static networkDelayTime: number = 10;
    static ourNetworkTime?: number; 
    static theirNetworkTime?: number; 

    static recordingDelayTime: number = 0;
    static ourRecordingStart: number = Kiku.currentTime();
    static theirRecordingStart: number = Kiku.ourRecordingStart;

    static recordDuration: number = 1000;
    static buffersReady: boolean = false;

    static ourBuffer?: Float32Array = new Float32Array(1);
    static theirBuffer?: Float32Array = new Float32Array(1);
    static inRecordingFlight: boolean = false;

    static currentMaster: boolean = false;

    /**
     * @method setup
     * @static
     * @public
     */
    public static setup () {

        Kiku.peerConnStack = new Array(0);
        Kiku.activeConn = 0;

        if ((<any>window).Peer !== undefined) {
            Kiku.peerjs = (<any>window).Peer;
        }

        KikuAudioStream.setup();
        KikuAudioStream.listenForStart(Kiku.onStartRecording);
        
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
    public static connectToServer (name: string, serverAddr: string, serverPort: string, serverPath:string, secure?: boolean) {

        // Setup properties
        Kiku.myname = name;
        Kiku.serverAddr = serverAddr;
        Kiku.serverPort = serverPort;
        Kiku.serverPath = serverPath;

        if (secure === undefined){
            secure = false;
        }

        // Format for peerjs
        let serverInfo: Object = {
            host: Kiku.serverAddr,
            port: Kiku.serverPort,
            path: Kiku.serverPath,
            secure: secure
        };

        // Connect to server
        Kiku.peer = new Kiku.peerjs(Kiku.myname, serverInfo); 

        // Assign callbacks to peer object
        Kiku.peer.on('connection', (conn: any) => {
            Kiku.onConnectionCallback(conn);
            conn.on('data', (message: any) => {
                Kiku.onDataCallback(conn, message);
            })
        })

    }

    /**
     * @method connectToDevice
     * @static
     * @public
     * @param deviceName 
     */
    public static connectToDevice (deviceName: string) {

        // Connect to peer
        let peerConn = Kiku.peer.connect(deviceName);

        // Setup callbacks before adding to the stack
        peerConn.on('open', () => {
            peerConn.on('data', (message: any) => {
                Kiku.onDataCallback(peerConn, message);
            })
        })

        // Add onto the connection stack
        Kiku.peerConnStack.push(peerConn);

    }

    /**
     * @method sendEmptyResponse
     * @param deviceName : Name of device to send message to
     */
    public static sendEmptyResponse (deviceName: string) {

        let stackIndex = Kiku.findIndexOfDevice(deviceName);

        if (stackIndex !== -1) {
            let message = new MessageData(MessageType.REQUEST_EMPTY_RESPONSE);
            if (Kiku.peerConnStack[stackIndex].open){
                Kiku.ourNetworkTime = Kiku.currentTime();
                PeerConnection.sendData(Kiku.peerConnStack[stackIndex], message);
            } else {
                console.warn('Connection to peer was not open to send the data via!');
            }
        } else {
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
    public static async startRecording (deviceName: string, fromNow: number, allowanceTime?: number) {

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
        } else {
            console.warn('No peer with that ID was found in the active connection stack!');
        }

        let buffer = await KikuAudioStream.recordAt(timeStamp, Kiku.recordDuration);
        Kiku.ourBuffer = <Float32Array>buffer;
        Kiku.currentMaster = false;

        return new Promise ((resolve, reject) => {
            setTimeout(()=> {
                if (Kiku.inRecordingFlight) {
                    reject('Recording was still in flight and was not transfered back to this device in time');
                } else {
                    let results = {
                        currentDeviceBuffer: Kiku.ourBuffer,
                        requestedDeviceBuffer: Kiku.theirBuffer,
                        recordingDelay: Kiku.recordingDelayTime,
                        networkDelay: Kiku.networkDelayTime
                    };
                    resolve (results);
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
    public static sendRecordedBuffer (deviceName: string, buffer: Float32Array) {
        let stackIndex = Kiku.findIndexOfDevice(deviceName);

        if (stackIndex !== -1) {
            let message = new MessageData(MessageType.RESPONSE_RECORD, Kiku.currentTime(), buffer);
            if (Kiku.peerConnStack[stackIndex].open)
                PeerConnection.sendData(Kiku.peerConnStack[stackIndex], message);
            else {
                console.warn('Connection to peer was not open to send the data via!');
            }
        } else {
            console.warn('No peer with that ID was found in the active connection stack!');
        }
    }

    /**
     * @method onStartRecording
     * @static
     * @private
     */
    private static onStartRecording () {
        if (Kiku.currentMaster !== true) {
            console.log('onStartRecording entering send message');
            let message = new MessageData(MessageType.STARTED_RECORDING);
            if (Kiku.peerConnStack[Kiku.activeConn].open){
                Kiku.ourRecordingStart = Kiku.currentTime();
                console.log('Sending message of start recording', message);
                PeerConnection.sendData(Kiku.peerConnStack[Kiku.activeConn], message);
            } else {
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
    public static setReturnAllowance (allowance: number) {
        Kiku.flightAllowanceTime = allowance;
    }

    /**
     * @method deleteUnusedConnections
     * @static
     * @public
     */
    public static deleteUnusedConnections () {
        for (let index = 0; index < Kiku.peerConnStack.length; index++){
            if (!Kiku.peerConnStack[index].open){
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
    private static findIndexOfDevice (deviceName: string) : number {

        for (var index = 0; index < Kiku.peerConnStack.length; index++){
            if (Kiku.peerConnStack[index].peer === deviceName){                     
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
    private static onDataCallback (conn: any, message: any) {

        console.log('message received:', message);

        switch (message.type) {

            case (MessageType.REQUEST_EMPTY_RESPONSE):
                let emptyResponse = new MessageData(MessageType.RESPONSE_EMPTY_RESPONSE);
                Kiku.ourNetworkTime = Kiku.currentTime();
                PeerConnection.sendData(conn, emptyResponse);
                break;

            case (MessageType.REQUEST_RECORD):
                console.log('Asked to start recording...')
                KikuAudioStream.recordAt(message.timeStamp, Kiku.recordDuration).then((buffer: any)=>{
                    console.log('Successfully completed recording!');
                    this.sendRecordedBuffer(conn.peer, buffer);
                })
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

        };
    };

    /**
     * @method onConnectionCallback
     * @static
     * @private
     * @param conn : Peerjs connection
     */
    private static onConnectionCallback (conn: any) {
        console.log('Connection received!', conn);
        Kiku.peerConnStack.push(conn);
    }

    /**
     * @method onOpenCallback
     * @static
     * @private
     */
    private static onOpenCallback () {
        console.log('Connection open!');
    }

    /**
     * @method currentTime
     * @static
     * @private
     */
    private static currentTime () : number {
        return performance.timing.navigationStart + performance.now();
    }

    /**
     * @method updateNetworkDelayTime
     * @static
     * @private
     */
    private static updateNetworkDelayTime () {
        Kiku.ourNetworkTime = Kiku.ourNetworkTime || performance.now();
        Kiku.theirNetworkTime = Kiku.theirNetworkTime || Kiku.ourNetworkTime;
        Kiku.networkDelayTime = Math.abs(Kiku.ourNetworkTime - Kiku.theirNetworkTime)/2;
    }

    /**
     * @method updateRecordingDelayTime
     * @static
     * @private
     */
    private static updateRecordingDelayTime () {
        Kiku.recordingDelayTime = Math.abs(Kiku.ourRecordingStart - Kiku.theirRecordingStart)/2000;
    }

}

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
    public static sendData (conn: any, messageData: MessageData) {

        let message: Object = {
            type: messageData.type,
            timeStamp: messageData.timeStamp || '',
            audioBuffer: messageData.audioBuffer || ''
        };

        if (conn._open) {
            conn.send(message);
        } else {
            console.warn('Tried to send message when connection is closed!', message);
        }
    }
}

/**
 * @class MessageData
 */
class MessageData {

    type: string;
    timeStamp?: number;
    audioBuffer?: Float32Array;

    /**
     * @constructor
     * @param messageType : Message type to send of type enum MessageType
     * @param timeStamp : Timing information related to the message
     * @param audioBuffer : Audio buffer to send
     */
    constructor (messageType: string, timeStamp?: number, audioBuffer?: Float32Array) {
        this.type = messageType;
        this.timeStamp = timeStamp;
        this.audioBuffer = audioBuffer;
    }

    /**
     * @method toObject
     * @public
     */
    public toObject () : Object {
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
enum MessageType {

    REQUEST_RECORD = 'requestRecord',
    RESPONSE_RECORD = 'responseRecord',

    STARTED_RECORDING = 'startedRecording',
    STOPPED_RECORDING = 'stoppedRecording',

    REQUEST_EMPTY_RESPONSE = 'requestEmptyResponse',
    RESPONSE_EMPTY_RESPONSE = 'responseEmptyResponse'

}

// Assign to window for easy JS startup
(<any>window).Kiku = Kiku;
