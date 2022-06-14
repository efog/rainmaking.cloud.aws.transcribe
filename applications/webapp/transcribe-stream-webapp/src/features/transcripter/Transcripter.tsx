import { Buffer } from "buffer";
import { CONNECTED, CONNECTING, DISCONNECTED, LANGUAGES, REGIONS, setApiKey, setLanguage, setRegion, setSessionId, setSocketState, setSpeakerName } from "./transcripter-slice";
import { Component } from "react";
import { connect } from "react-redux";
import { AudioRecorderWebSocketClient, connectRecorderSocket } from "./audio-recorder-websocket-client";
import * as marshaller from "@aws-sdk/eventstream-marshaller";
import * as utilUtf8Node from "@aws-sdk/util-utf8-node";
import styles from './Transcripter.module.css';
import * as uuid from "uuid";

const eventStreamMarshaller = new marshaller.EventStreamMarshaller(utilUtf8Node.toUtf8, utilUtf8Node.fromUtf8);

/**
 * Transcripter properties
 */
export interface TranscripterProps {
}

/**
 * Transcripter internal properties
 */
export interface TranscripterInternalProps {
    apiKey: string,
    language: string,
    region: string,
    sessionId: string,
    setApiKey: Function,
    setLanguage: Function,
    setRegion: Function,
    setSessionId: Function,
    setSocketState: Function,
    setSpeakerName: Function,
    socketState: any,
    speakerName: string,
}

/**
 * Transcripter component
 */
class Transcripter extends Component<TranscripterProps | TranscripterInternalProps> {

    private webSocketHost: string;
    private webSocketPort: string;
    private client: AudioRecorderWebSocketClient | undefined

    /**
     * Default constructor
     * @param props {TranscripterProps} component properties
     */
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
            setApiKey: (apiKey: string) => { dispatch(setApiKey(apiKey)) },
            setLanguage: (language: string) => { dispatch(setLanguage(language)) },
            setRegion: (region: string) => { dispatch(setRegion(region)) },
            setSessionId: (sessionId: string) => { dispatch(setSessionId(sessionId)) },
            setSocketState: (state: string) => { dispatch(setSocketState(state)) },
            setSpeakerName: (speakerName: string) => { dispatch(setSpeakerName(speakerName)) },
        };
    }

    async connect() {

        (this.props as TranscripterInternalProps).setSocketState(CONNECTING);
        const language = (this.props as TranscripterInternalProps).language;
        const callId = (this.props as TranscripterInternalProps).sessionId;
        const region = (this.props as TranscripterInternalProps).region;
        const username = (this.props as TranscripterInternalProps).speakerName;

        this.client = await connectRecorderSocket(this.webSocketHost, this.webSocketPort, language, callId, username, region);
        this.client.onclose((ev: CloseEvent) => {
            console.log(`connection closed ${JSON.stringify(ev)}`);
            (this.props as TranscripterInternalProps).setSocketState(DISCONNECTED);
        });
        this.client.onopen((ev: Event) => {
            console.log(`connection opened ${JSON.stringify(ev)}`);
            (this.props as TranscripterInternalProps).setSocketState(CONNECTED);
        });
        this.client.onmessage((ev: MessageEvent | undefined) => {
            if (ev) {
                const data = Buffer.from(ev.data as any);
                const messageWrapper = eventStreamMarshaller.unmarshall(data);
                const body = Array.from(messageWrapper.body);
                const messageBody = JSON.parse(String.fromCharCode.apply(String, body));
                console.log(`message received ${JSON.stringify(messageBody)}`);
            }
            else {
                console.log("received event from server but payload is undefined.");
            }
        });

    }

    disconnect() {
        this.client?.close();
    }

    componentDidMount() {
    }

    resetSessionId() {
        const sessionid = uuid.v4();
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
                    {/* <div className={styles.inputRow}>
                        <label>API Key</label>
                        <input type="text" id="apiKey" placeholder="API key"
                            onChange={(evt) => {
                                (this.props as TranscripterInternalProps).setApiKey(evt.target.value);
                            }}
                            value={(this.props as TranscripterInternalProps).apiKey}>
                        </input>
                    </div> */}
                    <div className={styles.inputRow}>
                        <label>Call Id</label>
                        <input type="text" id="sessionId" placeholder="session id"
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
                            type="text" id="speakerName" placeholder="speaker name"
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