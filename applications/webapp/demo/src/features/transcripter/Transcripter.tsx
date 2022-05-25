import { CONNECTED, CONNECTING, DISCONNECTED, setSocketState } from "./transcripter-slice";
import { Buffer } from "buffer";
import { Component } from "react";
import { connect } from "react-redux";
import { EventStreamMarshaller } from "@aws-sdk/eventstream-marshaller";
import { Message } from "@aws-sdk/eventstream-marshaller";
import { Recorder } from "./recorder";

const util_utf8_node = require("@aws-sdk/util-utf8-node");
const eventStreamMarshaller = new EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);

export interface TranscripterProps {
}

export interface TranscripterInternalProps {
    setSocketState: Function,
    socketState: any
}

class Transcripter extends Component<TranscripterProps | TranscripterInternalProps> {

    private webSocketHost: string;
    private webSocketPort: string;
    private webSocket: WebSocket | undefined;
    private tracks: MediaStreamTrack[];
    private audioContext: AudioContext | undefined;
    private recorder: AudioWorkletNode | undefined;
    private bufferSize: number | null;
    private inputChannels = 1;
    private outputChannels = 1;
    private source: MediaStreamAudioSourceNode | undefined;
    private audioRecorder: Recorder | undefined;

    constructor(props: TranscripterProps) {
        super(props);
        this.webSocketHost = process.env.REACT_APP_WEBSOCKET_HOST || "localhost";
        this.webSocketPort = process.env.REACT_APP_WEBSOCKET_PORT || "8080";
        this.tracks = new Array<MediaStreamTrack>();
        this.bufferSize = typeof window.AudioContext === "undefined" ? 4096 : null;
        this.recorder = undefined;
    }

    static mapStateToProps(state: any) {
        return { ...state.transcripter };
    }

    static mapDispatchToProps(dispatch: any) {
        return {
            setSocketState: (state: string) => { dispatch(setSocketState(state)) }
        };
    }

    pcmEncode(input: Float32Array) {
        let offset = 0;
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }

    downsampleBuffer(buffer: Float32Array, inputSampleRate = 44100, outputSampleRate = 16000) {

        if (outputSampleRate === inputSampleRate) {
            return buffer;
        }
        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;

        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0,
                count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result;
    }

    convertAudioToBinaryMessage(audioChunk: Float32Array): Uint8Array {
        // downsample and convert the raw audio bytes to PCM
        let downsampledBuffer = this.downsampleBuffer(audioChunk);
        let pcmEncodedBuffer = this.pcmEncode(downsampledBuffer);
        // add the right JSON headers and structure to the message
        let audioEventMessage = this.getAudioEventMessage(Buffer.from(pcmEncodedBuffer));
        //convert the JSON object + headers into a binary event stream message
        let binary = eventStreamMarshaller.marshall(audioEventMessage);
        return binary;
    }

    getAudioEventMessage(buffer: Buffer): Message {
        return {
            headers: {
                ':message-type': {
                    type: 'string',
                    value: 'event'
                },
                ':event-type': {
                    type: 'string',
                    value: 'AudioEvent'
                }
            },
            body: buffer
        };
    }

    async connect() {
        
        this.audioRecorder = await Recorder.start((e: { data: Float32Array }) => {
            const audioEventMessage = this.convertAudioToBinaryMessage(e.data);
            console.log(JSON.stringify(audioEventMessage));
            this.webSocket?.send(audioEventMessage);
        });

        this.webSocket = new WebSocket(`ws://${this.webSocketHost}:${this.webSocketPort}`);
        this.webSocket.binaryType = "arraybuffer";
        (this.props as TranscripterInternalProps).setSocketState(CONNECTING);
        if (this.webSocket) {
            this.webSocket.onclose = (ev: CloseEvent) => {
                console.log(`connection closed ${JSON.stringify(ev)}`);
                this.audioRecorder?.stop();
                (this.props as TranscripterInternalProps).setSocketState(DISCONNECTED);
            }
            this.webSocket.onopen = (ev: Event) => {
                console.log(`connection opened ${JSON.stringify(ev)}`);
                (this.props as TranscripterInternalProps).setSocketState(CONNECTED);
            }
            this.webSocket.onmessage = (ev: MessageEvent) => {
                console.log(`message received ${JSON.stringify(ev)}`);
            }
        }
    }

    async record() {
        // const microphone = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        // this.tracks = microphone.getTracks();
        // const audioContext = new AudioContext();
        // this.source = audioContext.createMediaStreamSource(microphone);
        // await audioContext.audioWorklet.addModule(`${process.env.PUBLIC_URL}/worklet/recorder-worklet.js`);
        // this.recorder = new AudioWorkletNode(audioContext, "recorder.worklet");
        // this.source.connect(this.recorder)
        //     .connect(audioContext.destination);
        // this.recorder.port.onmessage = (e: { data: Float32Array }) => {
        //     const audioEventMessage = this.convertAudioToBinaryMessage(e.data);
        //     console.log(JSON.stringify(audioEventMessage));
        //     this.webSocket?.send(audioEventMessage);
        // }
    }

    disconnect() {
        this.webSocket?.close();
    }

    componentDidMount() {
    }

    render() {
        return <div>
            <button onClick={async (ev) => {
                if ((this.props as TranscripterInternalProps).socketState === DISCONNECTED) {
                    await this.connect();
                    // this.record();
                }
            }}>Start</button>
            <button onClick={(ev) => {
                if ((this.props as TranscripterInternalProps).socketState === CONNECTED) {
                    this.disconnect();
                }
            }}>Stop</button>
            <span>{(this.props as TranscripterInternalProps).socketState}</span>
        </div>;
    }
}

export default connect(Transcripter.mapStateToProps, Transcripter.mapDispatchToProps)(Transcripter);