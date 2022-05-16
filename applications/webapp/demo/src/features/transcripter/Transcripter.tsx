import { CONNECTED, CONNECTING, DISCONNECTED, setSocketState } from "./transcripter-slice";
import { Component } from "react";
import { connect } from "react-redux";
import { Message } from "@aws-sdk/eventstream-marshaller";

const util_utf8_node = require("@aws-sdk/util-utf8-node");
const marshaller = require("@aws-sdk/eventstream-marshaller");
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);
const mic = require("microphone-stream").default;

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
    private micStream: any | undefined;
    private media: MediaStream | undefined;

    static mapStateToProps(state: any) {
        return { ...state.transcripter };
    }

    static mapDispatchToProps(dispatch: any) {
        return {
            setSocketState: (state: string) => { dispatch(setSocketState(state)) }
        };
    }

    connect() {
        this.webSocket = new WebSocket(`ws://${this.webSocketHost}:${this.webSocketPort}`);
        this.webSocket.binaryType = "arraybuffer";
        (this.props as TranscripterInternalProps).setSocketState(CONNECTING);
        if (this.webSocket) {
            this.webSocket.onclose = (ev: CloseEvent) => {
                console.log(`connection closed ${JSON.stringify(ev)}`);
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
        let raw = mic.toRaw(audioChunk);

        if (raw == null)
            return new Uint8Array(0);

        // downsample and convert the raw audio bytes to PCM
        let downsampledBuffer = this.downsampleBuffer(raw);
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
    async record() {
        window.navigator.mediaDevices.getUserMedia({
            "video": false,
            "audio": true
        }).then((mediaStream: MediaStream) => {
            this.micStream = new mic();
            this.micStream?.on("data", (rawAudioChunk: Float32Array) => {
                let binary = this.convertAudioToBinaryMessage(rawAudioChunk);
                if (this.webSocket?.readyState === this.webSocket?.OPEN)
                    this.webSocket?.send(binary);
            });
        }).catch((error) => {
            console.error(error);
            this.disconnect();
        });
    }

    disconnect() {
        this.webSocket?.close();
    }

    componentDidMount() {
    }

    render() {
        return <div>
            <button onClick={(ev) => {
                if ((this.props as TranscripterInternalProps).socketState === DISCONNECTED) {
                    this.connect();
                    this.record();
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

    constructor(props: TranscripterProps) {
        super(props);
        this.webSocketHost = process.env.REACT_APP_WEBSOCKET_HOST || "localhost";
        this.webSocketPort = process.env.REACT_APP_WEBSOCKET_PORT || "8080";
    }
}

export default connect(Transcripter.mapStateToProps, Transcripter.mapDispatchToProps)(Transcripter);