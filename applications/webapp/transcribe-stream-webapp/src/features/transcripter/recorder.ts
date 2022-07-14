export interface RecorderOptions {
    audioHandler: ((this: MessagePort, ev: MessageEvent) => any),
    recorderWorkletUrl?: string
}

export class Recorder {

    public microphone: MediaStream | undefined;
    public recorderWorklet: AudioWorkletNode | undefined;
    public source: MediaStreamAudioSourceNode | undefined;
    public tracks: MediaStreamTrack[] = [];

    private _onaudio: ((this: MessagePort, ev: MessageEvent) => any);

    get onaudio(): ((this: MessagePort, ev: MessageEvent) => any) {
        return this._onaudio;
    }

    get audioSampleRate() : number {
        if(this.tracks && this.tracks.length > 0 && this.tracks[0].getSettings().sampleRate) {
            return this.tracks[0].getSettings().sampleRate || 44100;
        }
        return 44100;
    }

    private constructor(onaudioHandler: ((this: MessagePort, ev: MessageEvent) => any)) {
        this._onaudio = onaudioHandler;
    }

    static async start(options: RecorderOptions): Promise<Recorder> {
        const microphone = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        const tracks = microphone.getAudioTracks();
        for (let index = 0; index < tracks.length; index++) {
            const track = tracks[index];
            console.log(`settings for track ${index}: ${JSON.stringify(track.getSettings())}`);
            // console.log(`capabilities for track ${index}: ${JSON.stringify(track.getCapabilities())}`);
            console.log(`constraints for track ${index}: ${JSON.stringify(track.getConstraints())}`);
        }
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(microphone);
        await audioContext.audioWorklet.addModule(options.recorderWorkletUrl || `${process.env.PUBLIC_URL}/worklet/recorder-worklet.js`);
        const recorderWorklet = new AudioWorkletNode(audioContext, "recorder.worklet");
        source.connect(recorderWorklet).connect(audioContext.destination);
        recorderWorklet.port.onmessage = options.audioHandler;
        return Object.assign(new Recorder(options.audioHandler), { microphone, recorderWorklet, source, tracks });
    }

    async stop() {
        for (let index = 0; index < this.tracks?.length || 0; index++) {
            const element = this.tracks[index];
            element.stop();
        }
        this.source?.disconnect();
        this.recorderWorklet?.disconnect();
    }
}