declare var MediaRecorder: any;

/**
 * @class KikuAudioStream
 */
export class KikuAudioStream {

    static isRecording: boolean = false;
    static activeBuffer: Float32Array = new Float32Array(1);
    static recordedBuffer: Float32Array = new Float32Array(1);

    public static startedRecording: Function = () => {};
    public static finishedRecording: Function = () => {};

    static audioContext: AudioContext = new AudioContext() || (<any>window).webkitAudioContext();
    static scriptNode?: ScriptProcessorNode;
    static mediaStreamSourceNode?: MediaStreamAudioSourceNode;

    static micRecorder?: MediaStream;

    static supported: boolean = false;

    private static resetAudioBuffer: boolean = false;

    /**
     * @method setup
     * @static
     * @public
     */
    public static setup () {

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

            console.log('getUserMedia supported.');
            navigator.mediaDevices.getUserMedia (
               <any>{
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
               .catch(function(err) {
                  console.warn('The following getUserMedia error occured: ' + err);
               }
    
            );
    
         } else { // Media devices weren't available
            console.warn('getUserMedia not supported on your browser!');
         }


    }

    /**
     * @method listenForStart
     * @static
     * @public
     * @param callback : Callback to call on the start of recording
     */
    public static listenForStart (callback: Function) {
        this.startedRecording = callback;
    }

    /**
     * @method listenForEnd
     * @static
     * @public
     * @param callback : Callback to call on the end of recording
     */
    public static listenForEnd (callback: Function) {
        this.finishedRecording = callback;
    }

    /**
     * @method float32bufferConcat
     * @static
     * @private
     * @param buffer0 
     * @param buffer1 
     */
    private static float32bufferConcat (buffer0: Float32Array, buffer1: Float32Array) {

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
    private static setupStream (stream: MediaStream) {

        // Update stream info
        KikuAudioStream.supported = true;
        this.micRecorder = new MediaRecorder(stream);

        // Create live audio context processing
        KikuAudioStream.scriptNode = this.audioContext.createScriptProcessor(1024, 1, 1);
        KikuAudioStream.mediaStreamSourceNode = this.audioContext.createMediaStreamSource(stream);

        // Callback for script processor function
        KikuAudioStream.scriptNode.onaudioprocess = function(event) {

            // Add onto recorded data when set to true
            if(KikuAudioStream.isRecording) {
                KikuAudioStream.activeBuffer = KikuAudioStream.float32bufferConcat(KikuAudioStream.activeBuffer, event.inputBuffer.getChannelData(0));
            } else {
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
    public static async recordAt (time: number, duration: number) {

        // Estimate execution time
        let eta_ms = time - KikuAudioStream.currentTime();
        console.log('Starting to record in ' + eta_ms + ' from now (' + eta_ms/1000 + ')');

        // Declare callback until execution time
        let waitUntil = () => {
            return new Promise ((resolve) => {
                setTimeout(()=>{
                    KikuAudioStream.record(duration).then((recording)=>{
                        resolve(recording);
                    })
                }, eta_ms);
            })
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
    public static record (duration: number) {

        return new Promise ((resolve) => {

            // Set record atomic boolean true
            KikuAudioStream.isRecording = true;

            // Notify listeners
            KikuAudioStream.startedRecording();

            // Timeout until finish
            setTimeout(()=>{
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
    public static recording () : boolean {
        return KikuAudioStream.isRecording;
    }

    /**
     * @method getLastRecordedBuffer
     * @static
     * @public
     */
    public static getLastRecordedBuffer () : Float32Array {
        return KikuAudioStream.recordedBuffer;
    }

    /**
     * @method currentTime
     * @static
     * @private
     */
    private static currentTime () : number {
        return performance.timing.navigationStart + performance.now();
    }
}
