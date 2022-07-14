import { Buffer } from "buffer";
import { EventStreamMarshaller, Message } from "@aws-sdk/eventstream-marshaller";
import { EventEmitter } from "events";
import { Recorder } from "./recorder";
import * as util_utf8_node from "@aws-sdk/util-utf8-node";

const eventStreamMarshaller = new EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);

export class AudioRecorderWebSocketClient {

    private emitter: EventEmitter;
    private webSocket: WebSocket;
    private recorder: Recorder;

    constructor(webSocket: WebSocket, recorder: Recorder) { 
        this.emitter = new EventEmitter();
        this.recorder = recorder;
        this.webSocket = webSocket;
        if (webSocket) {
            webSocket.onclose = (ev: CloseEvent) => {
                this.emitter.emit("close");
                recorder.stop();
            }
            webSocket.onopen = (ev: Event) => {
                this.emitter.emit("open");
            }
            webSocket.onmessage = (ev: MessageEvent) => {
                this.emitter.emit("message");
            }
        }
    }

    close() {
        this.webSocket?.close();
    }

    onclose(listener: (...args: any[]) => void): EventEmitter {
        return this.emitter.addListener("close", listener);
    }
    
    onopen(listener: (...args: any[]) => void): EventEmitter {
        return this.emitter.addListener("open", listener);
    }
    
    onmessage(listener: (...args: any[]) => void): EventEmitter {
        return this.emitter.addListener("message", listener);
    }
}

/**
 * Connects audio recorder with web server through websocket
 * @param webSocketHost websocket server host
 * @param webSocketPort websocket port
 * @param language service language code
 * @param callId call identifier
 * @param username caller username
 * @param region target service region
 * @returns {Promise<AudioRecorderWebSocketClient>} audio recorder client   
 */
export async function connectRecorderSocket(webSocketHost: string, 
    webSocketPort: string, 
    language: string, 
    callId: string, 
    username: string, 
    region: string) : Promise<AudioRecorderWebSocketClient> {

    let webSocket: WebSocket;
    let sampleRate = 44100;
    let outputSampleRate = 44100;

    const audioHandler = (e: { data: Float32Array }) => {
        // const audioEventMessage = convertAudioToBinaryMessage(e.data, sampleRate);
        // webSocket?.send(audioEventMessage);
        const audioArrayBuffer = downsampleAndEncodeAudio(e.data, sampleRate, outputSampleRate);
        webSocket?.send(audioArrayBuffer);
    };

    const audioRecorder = await Recorder.start({
        audioHandler: audioHandler
    });

    const webSocketUrl = new URL(`${webSocketHost === "localhost" ? "ws" : "wss"}://${webSocketHost}:${webSocketPort}/api/stt/transcribe`);
    console.log(webSocketUrl);

    sampleRate = audioRecorder.audioSampleRate;
    webSocketUrl.searchParams.append("sampleRate", outputSampleRate.toString());
    webSocketUrl.searchParams.append("language", language);
    webSocketUrl.searchParams.append("callId", callId);
    webSocketUrl.searchParams.append("region", region);
    webSocketUrl.searchParams.append("username", username);
    
    webSocket = new WebSocket(webSocketUrl);
    webSocket.binaryType = "arraybuffer";
    
    return new AudioRecorderWebSocketClient(webSocket, audioRecorder);

}

function convertAudioToBinaryMessage(audioChunk: Float32Array, outputSampleRate: number = 44100): Uint8Array {
    // downsample and convert the raw audio bytes to PCM
    let downsampledBuffer = downsampleBuffer(audioChunk, 44100, outputSampleRate);
    let pcmEncodedBuffer = pcmEncode(downsampledBuffer);
    // add the right JSON headers and structure to the message
    let audioEventMessage = getAudioEventMessage(Buffer.from(pcmEncodedBuffer));
    //convert the JSON object + headers into a binary event stream message
    let binary = eventStreamMarshaller.marshall(audioEventMessage);
    return binary;
}

function downsampleAndEncodeAudio(audioChunk: Float32Array, inputSampleRate: number = 44100, outputSampleRate: number = 44100) : ArrayBuffer {
    let downsampledBuffer = downsampleBuffer(audioChunk, inputSampleRate, outputSampleRate);
    let pcmEncodedBuffer = pcmEncode(downsampledBuffer);
    return pcmEncodedBuffer;
}

function downsampleBuffer(buffer: Float32Array, inputSampleRate = 44100, outputSampleRate = 16000) {

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

function getAudioEventMessage(buffer: Buffer): Message {
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

function pcmEncode(input: Float32Array) {
    let offset = 0;
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}