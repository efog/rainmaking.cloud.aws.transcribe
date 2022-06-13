import { CONNECTED, CONNECTING, DISCONNECTED, LANGUAGES, REGIONS, setLanguage, setRegion, setSessionId, setSocketState, setSpeakerName } from "./transcripter-slice";
import { Buffer } from "buffer";
import { Component } from "react";
import { EventStreamMarshaller } from "@aws-sdk/eventstream-marshaller";
import { Message } from "@aws-sdk/eventstream-marshaller";
import { Recorder } from "./recorder";
import { connect } from "react-redux";
import styles from './Transcripter.module.css';
import * as uuid from "uuid";

const util_utf8_node = require("@aws-sdk/util-utf8-node");
const eventStreamMarshaller = new EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);

export interface TranscripterProps {
}

export interface TranscripterInternalProps {
    language: string,
    region: string,
    sessionId: string,
    setLanguage: Function,
    setRegion: Function,
    setSessionId: Function,
    setSocketState: Function,
    setSpeakerName: Function,
    socketState: any,
    speakerName: string,
}

class Transcripter extends Component<TranscripterProps | TranscripterInternalProps> {

    private webSocketHost: string;
    private webSocketPort: string;
    private webSocket: WebSocket | undefined;
    private audioRecorder: Recorder | undefined;

    constructor(props: TranscripterProps) {
        super(props);
        this.webSocketHost = process.env.REACT_APP_WEBSOCKET_HOST || "localhost";
        this.webSocketPort = process.env.REACT_APP_WEBSOCKET_PORT || "8080";
    }

    static mapStateToProps(state: any) {
        return { ...state.transcripter };
    }

    static mapDispatchToProps(dispatch: any) {
        return {
            setLanguage: (language: string) => { dispatch(setLanguage(language)) },
            setRegion: (region: string) => { dispatch(setRegion(region)) },
            setSessionId: (sessionId: string) => { dispatch(setSessionId(sessionId)) },
            setSocketState: (state: string) => { dispatch(setSocketState(state)) },
            setSpeakerName: (speakerName: string) => { dispatch(setSpeakerName(speakerName))},
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

    convertAudioToBinaryMessage(audioChunk: Float32Array, outputSampleRate: number = 44100): Uint8Array {
        // downsample and convert the raw audio bytes to PCM
        let downsampledBuffer = this.downsampleBuffer(audioChunk, 44100, outputSampleRate);
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

        const sampleRate = 44100;
        const language = (this.props as TranscripterInternalProps).language;
        const callId = (this.props as TranscripterInternalProps).sessionId;
        const region = (this.props as TranscripterInternalProps).region;

        const audioHandler = (e: { data: Float32Array }) => {
            const audioEventMessage = this.convertAudioToBinaryMessage(e.data, sampleRate);
            this.webSocket?.send(audioEventMessage);
        };

        this.audioRecorder = await Recorder.start({
            audioHandler: audioHandler
        });

        const webSocketUrl = new URL(`ws://${this.webSocketHost}:${this.webSocketPort}/api/stt/`);
        console.log(webSocketUrl);

        webSocketUrl.searchParams.append("sampleRate", sampleRate.toString());
        webSocketUrl.searchParams.append("language", language);
        webSocketUrl.searchParams.append("callId", callId);
        webSocketUrl.searchParams.append("region", region);
        console.log(JSON.stringify(webSocketUrl));
        this.webSocket = new WebSocket(webSocketUrl);
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

    disconnect() {
        this.webSocket?.close();
    }

    componentDidMount() {
    }

    resetSessionId() {
        const sessionid = uuid.v4();
        console.log(`new session id ${sessionid}`);
        (this.props as TranscripterInternalProps).setSessionId(sessionid);
    }

    render() {
        const regionOptions = Object.keys(REGIONS).map((region: string) => {
            return <option key={REGIONS[region].toString()} value={REGIONS[region].toString()}>{region}</option>
        });
        const languageOptions = Object.keys(LANGUAGES).map((language: string) => {
            return <option key={LANGUAGES[language].toString()} value={LANGUAGES[language].toString()}>{language}</option>
        });
        return <div>
            <div className={styles.content}>
                <div className={styles.section}>
                    <h3>What is it?</h3>
                    <p>
                        This app captures a user reading a small text out loud and compares the results of the speech to text processing with the
                        expected outcome.
                    </p>
                    <h3>How to use it?</h3>
                    <p>
                        Enter a session id manually or use the reset button, select a language and a region. Upon the selection of a language
                        a simple text will be displayed. Press the start button and start reading the text out loud.
                    </p>
                </div>
                <div className={styles.section}>
                    <h3>Try it Out!</h3>
                    <div className={styles.inputRow}>
                        <label>Session Id</label>
                        <input disabled={true} type="text" id="sessionId" placeholder="enter session id"
                            onChange={(evt) => {
                                (this.props as TranscripterInternalProps).setSessionId(evt.target.value);
                            }}
                            value={(this.props as TranscripterInternalProps).sessionId}>
                        </input>
                        <button disabled={(this.props as TranscripterInternalProps).socketState === CONNECTED} onClick={(evt) => { this.resetSessionId(); }}>reset</button>
                    </div>
                    <div className={styles.inputRow}>
                        <label>Speaker Name</label>
                        <input 
                            disabled={(this.props as TranscripterInternalProps).socketState === CONNECTED}
                            type="text" id="speakerName" placeholder="enter speaker name"
                            onChange={(evt) => {
                                (this.props as TranscripterInternalProps).setSpeakerName(evt.target.value);
                            }}
                            value={(this.props as TranscripterInternalProps).speakerName}>
                        </input>
                    </div>
                    <div className={styles.inputRow}>
                        <label>Language</label>
                        <select
                            disabled={(this.props as TranscripterInternalProps).socketState === CONNECTED}
                            value={(this.props as TranscripterInternalProps).language}
                            onChange={(evt) => {
                                (this.props as TranscripterInternalProps).setLanguage(evt.target.value);
                            }}
                            id="language">
                            {languageOptions}
                        </select>
                    </div>
                    <div className={styles.inputRow}>
                        <label>Region</label>
                        <select
                            disabled={(this.props as TranscripterInternalProps).socketState === CONNECTED}
                            value={(this.props as TranscripterInternalProps).region}
                            onChange={(evt) => {
                                (this.props as TranscripterInternalProps).setRegion(evt.target.value);
                            }} 
                            id="region">
                            {regionOptions}
                        </select>
                    </div>
                    <div className={styles.inputRow}>
                        <button 
                            disabled={(this.props as TranscripterInternalProps).speakerName === "" || (this.props as TranscripterInternalProps).socketState === CONNECTED} 
                            onClick={async (ev) => {
                                if ((this.props as TranscripterInternalProps).socketState === DISCONNECTED) {
                                    await this.connect();
                                    // this.record();
                                }
                            }}>Start</button>
                        <button 
                            disabled={(this.props as TranscripterInternalProps).socketState === DISCONNECTED}
                            onClick={(ev) => {
                                if ((this.props as TranscripterInternalProps).socketState === CONNECTED) {
                                    this.disconnect();
                                }
                            }}>Stop</button>
                        <label>{(this.props as TranscripterInternalProps).socketState}</label>
                    </div>
                </div>
            </div>
        </div>;
    }
}

export default connect(Transcripter.mapStateToProps, Transcripter.mapDispatchToProps)(Transcripter);