import EventEmitter from "events";
import { Component } from "react";
import { connect } from "react-redux";

export type ConversationProps = {
    children: JSX.Element;
}

class ConversationClient {

    private webSocket: WebSocket;
    private emitter: EventEmitter;

    private constructor(webSocket: WebSocket) {
        this.webSocket = webSocket;
        this.emitter = new EventEmitter();
        
        webSocket.onmessage = (ev: MessageEvent) => {
            this.emitter.emit("message", ev);
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
    }

    static mapStateToProps(state: any) {
        return { ...state.transcripter };
    }

    static mapDispatchToProps(dispatch: any) {
        return {
        };
    }

    render() {
        const props = this.props as ConversationProps;
        return <div>
            {props.children}
        </div>;
    }
}

export default connect(Conversation.mapStateToProps, Conversation.mapDispatchToProps)(Conversation);