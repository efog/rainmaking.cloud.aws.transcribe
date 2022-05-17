"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscribeStreamingJobService = void 0;
const client_transcribe_streaming_1 = require("@aws-sdk/client-transcribe-streaming");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)("DEBUG::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const trace = (0, debug_1.default)("TRACE::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const info = (0, debug_1.default)("INFO::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const warn = (0, debug_1.default)("WARN::SERVER::SERVICES::transcribe-streaming-job-service.ts");
const error = (0, debug_1.default)("ERROR::SERVER::SERVICES::transcribe-streaming-job-service.ts");
class TranscribeStreamingJobService {
    constructor(options) {
        var _a;
        this.options = options;
        this.client = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.transcribeClient) || new client_transcribe_streaming_1.TranscribeStreamingClient({
            region: process.env.AWS_DEFAULT_REGION || "us-east-1"
        });
    }
    /**
     * Transcribes audio stream
     */
    transcribeStream() {
        return __awaiter(this, void 0, void 0, function* () {
            const options = this.options;
            function getAsyncIterator() {
                var _a;
                return __asyncGenerator(this, arguments, function* getAsyncIterator_1() {
                    trace("reading chunk");
                    const chunk = (_a = options === null || options === void 0 ? void 0 : options.readableStream) === null || _a === void 0 ? void 0 : _a.read();
                    yield yield __await({ AudioEvent: { AudioChunk: chunk } });
                });
            }
            const stream = getAsyncIterator;
            const command = new client_transcribe_streaming_1.StartStreamTranscriptionCommand({
                AudioStream: stream(),
                MediaSampleRateHertz: 16000,
                MediaEncoding: "pcm",
                LanguageCode: "en-US"
            });
            const output = yield this.client.send(command);
            trace(`transcribe output ${JSON.stringify(output.RequestId)}`);
        });
    }
}
exports.TranscribeStreamingJobService = TranscribeStreamingJobService;
