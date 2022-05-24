/*
* Refactored from https://github.com/amazon-archives/amazon-transcribe-websocket-static/blob/master/lib/aws-signature-v4.js
*
*/

import * as crypto from "crypto";
import * as querystring from "query-string";

function toTime(time: string) {
    return new Date(time).toISOString().replace(/[:-]|\.\d{3}/g, "");
    // return new Date(time).toISOString().replace(/[:\-]|\.\d{3}/g, "");
}

function toDate(time: string): string {
    return toTime(time).substring(0, 8);
}

function hash(input: string, encoding?: crypto.BinaryToTextEncoding | undefined): string | Buffer {
    const update = crypto.createHash("sha256")
        .update(input, "utf8");
    return encoding ? update.digest(encoding) : update.digest();
}

function hmac(key: string | Buffer, input: string, encoding?: crypto.BinaryToTextEncoding | undefined): string | Buffer {
    const update = crypto.createHmac("sha256", key)
        .update(input, "utf8");
    return encoding ? update.digest(encoding) : update.digest();
}

export function createCanonicalRequest(method: string, pathname: string, query: any, headers: any, payload: any): string {
    return [
        method.toUpperCase(),
        pathname,
        createCanonicalQueryString(query),
        createCanonicalHeaders(headers),
        createSignedHeaders(headers),
        payload
    ].join("\n");
};

export function createCanonicalQueryString(params: any): string {
    return Object.keys(params).sort().map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    }).join("&");
};

export function createCanonicalHeaders(headers: any): string {
    return Object.keys(headers).sort().map((name) => {
        return name.toLowerCase().trim() + ":" + headers[name].toString().trim() + "\n";
    }).join("");
};

export function createSignedHeaders(headers: any): string {
    return Object.keys(headers).sort().map((name) => {
        return name.toLowerCase().trim();
    }).join(";");
};

export function createCredentialScope(time: string, region: string, service: string): string {
    return [toDate(time), region, service, "aws4_request"].join("/");
};

export function createStringToSign(time: string, region: string, service: string, request: string): string {
    return [
        "AWS4-HMAC-SHA256",
        toTime(time),
        createCredentialScope(time, region, service),
        hash(request, "hex")
    ].join("\n");
};

export function createSignature(secret: string, time: string, region: string, service: string, stringToSign: string) {
    const h1 = hmac("AWS4" + secret, toDate(time)); // date-key
    const h2 = hmac(h1, region); // region-key
    const h3 = hmac(h2, service); // service-key
    const h4 = hmac(h3, "aws4_request"); // signing-key
    return hmac(h4, stringToSign, "hex") as string;
};

export function createPresignedS3URL(name: string, options: any) {
    options = options || {};
    options.method = options.method || "GET";
    options.bucket = options.bucket || process.env.AWS_S3_BUCKET;
    return createPresignedURL(
        options.method,
        options.bucket + ".s3.amazonaws.com",
        "/" + name,
        "s3",
        "UNSIGNED-PAYLOAD",
        options
    );
};

export function createPresignedURL(method: string, host: string, path: string, service: string, payload: any, options: any) {
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
};
