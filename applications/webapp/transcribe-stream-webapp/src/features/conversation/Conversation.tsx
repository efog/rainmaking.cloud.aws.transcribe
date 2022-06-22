import EventEmitter from "events";
import { Component } from "react";
import { connect } from "react-redux";
import { setCallId, setCallerId } from "../transcripter/transcripter-slice";
import { setMessages } from "./conversation-slice";

export type ConversationProps = {
    children: JSX.Element;
    setCallId?: Function;
    setCallerId?: Function;
    setMessages?: Function;
    messages?: Transcript[];
}

export type Transcript = {
    callId?: string,
    callerId?: string,
    eventTimestamp?: string,
    endTime?: number,
    resultId?: string,
    speakerName?: string,
    startTime?: number,
    transcript?: string
}

export enum ConversationEventMessageType {
    "CALL_ID" = "callId",
    "CALLER_ID" = "callerId",
    "TRANSCRIPTS" = "transcripts",
}

export type ConversationEventMessage = {
    type: ConversationEventMessageType
    value: string | Transcript[]
}

class ConversationClient {

    private webSocket: WebSocket;
    private emitter: EventEmitter;

    private constructor(webSocket: WebSocket) {
        this.webSocket = webSocket;
        this.emitter = new EventEmitter();

        webSocket.onmessage = (ev: MessageEvent) => {
            this.emitter.emit("message", JSON.parse(ev.data));
        }
        webSocket.onclose = (ev: CloseEvent) => {
            this.emitter.emit("close");
        }
        webSocket.onopen = (ev: Event) => {
            this.emitter.emit("open");
        }
    }

    onmessage(listener: (...args: any[]) => void): EventEmitter {
        return this.emitter.addListener("message", listener);
    }

    static connect(host: string, port: string) {
        let webSocket: WebSocket;
        const webSocketUrl = new URL(`${host === "localhost" ? "ws" : "wss"}://${host}:${port}/api/stt/connect`);
        webSocket = new WebSocket(webSocketUrl);
        return new ConversationClient(webSocket);
    }
}

class Conversation extends Component<ConversationProps> {

    private webSocketHost: string;
    private webSocketPort: string;
    private websocketClient?: ConversationClient;

    constructor(props: ConversationProps) {
        super(props);
        this.webSocketHost = process.env.REACT_APP_WEBSOCKET_HOST || "localhost";
        this.webSocketPort = process.env.REACT_APP_WEBSOCKET_PORT || "8080";
    }

    componentDidMount() {
        this.websocketClient = ConversationClient.connect(this.webSocketHost, this.webSocketPort);
        this.websocketClient.onmessage((data: ConversationEventMessage) => {
            console.log(`received event from backend ${JSON.stringify(data)}`);
            switch (data.type) {
                case ConversationEventMessageType.CALLER_ID:
                    if (this.props.setCallerId) {
                        this.props.setCallerId(data.value);
                    }
                    break;
                case ConversationEventMessageType.CALL_ID:
                    if (this.props.setCallId) {
                        this.props.setCallId(data.value);
                    }
                    break;
                case ConversationEventMessageType.TRANSCRIPTS:
                    if(this.props.setMessages) {
                        this.props.setMessages(data.value as Transcript[]);
                    }
                    break;
                default:
                    break;
            }
        });
    }

    static mapStateToProps(state: any) {
        const stateProps = { ...state.conversation, ...state.transcripter };
        console.log(`${JSON.stringify(stateProps)}`);
        return stateProps;
    }

    static mapDispatchToProps(dispatch: any) {
        return {
            setCallId: (sessionId: string) => { dispatch(setCallId(sessionId)) },
            setCallerId: (speakerName: string) => { dispatch(setCallerId(speakerName)) },
            setMessages: (messages: Transcript[]) => { dispatch(setMessages(messages)) },
        };
    }

    render() {
        const props = this.props as ConversationProps;
        console.log(`${JSON.stringify(props.messages)}`);
        const messages = props.messages ? props?.messages.map((message: Transcript) => {
            return <div key={message.eventTimestamp}>{message.transcript}</div>;
        }) : <div>No new messages for the past 2 minutes...</div>;
        return <div>
            {props.children}
            {messages}
        </div>;
    }
}

export default connect(Conversation.mapStateToProps, Conversation.mapDispatchToProps)(Conversation);