import { EventEmitter } from "stream";

export class StartRecordOutput {
}
export class Recorder {
    
    public microphone: MediaStream | undefined;
    public recorderWorklet: AudioWorkletNode | undefined;
    public source: MediaStreamAudioSourceNode | undefined;
    public tracks: MediaStreamTrack[] = [];

    private _onaudio : ((this: MessagePort, ev: MessageEvent) => any);

    get onaudio() : ((this: MessagePort, ev: MessageEvent) => any) {
        return this._onaudio;
    }

    constructor(onaudioHandler: ((this: MessagePort, ev: MessageEvent) => any)) { 
        this._onaudio = onaudioHandler;
    }

    static async start(onaudioHandler: ((this: MessagePort, ev: MessageEvent) => any)): Promise<Recorder> {
        const microphone = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        const tracks = microphone.getAudioTracks();
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(microphone);
        await audioContext.audioWorklet.addModule(`${process.env.PUBLIC_URL}/worklet/recorder-worklet.js`);
        const recorderWorklet = new AudioWorkletNode(audioContext, "recorder.worklet");
        source.connect(recorderWorklet).connect(audioContext.destination);
        recorderWorklet.port.onmessage = onaudioHandler;
        return Object.assign(new Recorder(onaudioHandler), { microphone, recorderWorklet, source, tracks });
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