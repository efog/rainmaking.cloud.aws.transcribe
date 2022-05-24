"use strict";
/*
* Refactored from https://github.com/amazon-archives/amazon-transcribe-websocket-static/blob/master/lib/aws-signature-v4.js
*
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPresignedURL = exports.createPresignedS3URL = exports.createSignature = exports.createStringToSign = exports.createCredentialScope = exports.createSignedHeaders = exports.createCanonicalHeaders = exports.createCanonicalQueryString = exports.createCanonicalRequest = void 0;
const crypto = __importStar(require("crypto"));
const querystring = __importStar(require("query-string"));
function toTime(time) {
    return new Date(time).toISOString().replace(/[:-]|\.\d{3}/g, "");
    // return new Date(time).toISOString().replace(/[:\-]|\.\d{3}/g, "");
}
function toDate(time) {
    return toTime(time).substring(0, 8);
}
function hash(input, encoding) {
    const update = crypto.createHash("sha256")
        .update(input, "utf8");
    return encoding ? update.digest(encoding) : update.digest();
}
function hmac(key, input, encoding) {
    const update = crypto.createHmac("sha256", key)
        .update(input, "utf8");
    return encoding ? update.digest(encoding) : update.digest();
}
function createCanonicalRequest(method, pathname, query, headers, payload) {
    return [
        method.toUpperCase(),
        pathname,
        createCanonicalQueryString(query),
        createCanonicalHeaders(headers),
        createSignedHeaders(headers),
        payload
    ].join("\n");
}
exports.createCanonicalRequest = createCanonicalRequest;
;
function createCanonicalQueryString(params) {
    return Object.keys(params).sort().map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    }).join("&");
}
exports.createCanonicalQueryString = createCanonicalQueryString;
;
function createCanonicalHeaders(headers) {
    return Object.keys(headers).sort().map((name) => {
        return name.toLowerCase().trim() + ":" + headers[name].toString().trim() + "\n";
    }).join("");
}
exports.createCanonicalHeaders = createCanonicalHeaders;
;
function createSignedHeaders(headers) {
    return Object.keys(headers).sort().map((name) => {
        return name.toLowerCase().trim();
    }).join(";");
}
exports.createSignedHeaders = createSignedHeaders;
;
function createCredentialScope(time, region, service) {
    return [toDate(time), region, service, "aws4_request"].join("/");
}
exports.createCredentialScope = createCredentialScope;
;
function createStringToSign(time, region, service, request) {
    return [
        "AWS4-HMAC-SHA256",
        toTime(time),
        createCredentialScope(time, region, service),
        hash(request, "hex")
    ].join("\n");
}
exports.createStringToSign = createStringToSign;
;
function createSignature(secret, time, region, service, stringToSign) {
    const h1 = hmac("AWS4" + secret, toDate(time)); // date-key
    const h2 = hmac(h1, region); // region-key
    const h3 = hmac(h2, service); // service-key
    const h4 = hmac(h3, "aws4_request"); // signing-key
    return hmac(h4, stringToSign, "hex");
}
exports.createSignature = createSignature;
;
function createPresignedS3URL(name, options) {
    options = options || {};
    options.method = options.method || "GET";
    options.bucket = options.bucket || process.env.AWS_S3_BUCKET;
    return createPresignedURL(options.method, options.bucket + ".s3.amazonaws.com", "/" + name, "s3", "UNSIGNED-PAYLOAD", options);
}
exports.createPresignedS3URL = createPresignedS3URL;
;
function createPresignedURL(method, host, path, service, payload, options) {
    options = options || {};
    options.key = options.key || process.env.AWS_ACCESS_KEY_ID;
    options.secret = options.secret || process.env.AWS_SECRET_ACCESS_KEY;
    options.protocol = options.protocol || "https";
    options.headers = options.headers || {};
    options.timestamp = options.timestamp || Date.now();
    options.region = options.region || process.env.AWS_REGION || "us-east-1";
    options.expires = options.expires || 86400; // 24 hours
    options.headers = options.headers || {};
    // host is required
    options.headers.Host = host;
    const query = options.query ? querystring.parse(options.query) : {};
    query["X-Amz-Algorithm"] = "AWS4-HMAC-SHA256";
    query["X-Amz-Credential"] = options.key + "/" + createCredentialScope(options.timestamp, options.region, service);
    query["X-Amz-Date"] = toTime(options.timestamp);
    query["X-Amz-Expires"] = options.expires;
    query["X-Amz-SignedHeaders"] = createSignedHeaders(options.headers);
    if (options.sessionToken) {
        query["X-Amz-Security-Token"] = options.sessionToken;
    }
    const canonicalRequest = createCanonicalRequest(method, path, query, options.headers, payload);
    const stringToSign = createStringToSign(options.timestamp, options.region, service, canonicalRequest);
    const signature = createSignature(options.secret, options.timestamp, options.region, service, stringToSign);
    query["X-Amz-Signature"] = signature;
    return options.protocol + "://" + host + path + "?" + querystring.stringify(query);
}
exports.createPresignedURL = createPresignedURL;
;
