# rainmaking.cloud.aws.transcribe
An Amazon Transcribe Streaming Stream Processing Demo

## What is it
This repository contains a fully working example of a speech to text streaming using Amazon Transcribe.

## Components

This solution is split into three components: web application, streaming server and a processing pipeline

### Web Application

This application is built using React and React-Redux.

It captures the microphone input using an audio worklet. Upon audio acquisition it downsamples into 44100KHz if the input uses an higher sample rate otherwise 
there's no downsampling and it then encodes the downsampled data into PCM format for consumption by the streaming server. The web application opens two websockets 
with the streaming server, one for the audio data and one for the conversation stream produced by the streaming server.

This application is a static app distributed by an S3 bucket and CloudFront. 

### Streaming Server

This application is build in NodeJS and uses ExpressJS to host the websocket endpoints and the healthcheck endpoint.

This application is fronted using an Application Load Balancer and hosted using Amazon ECS. It outputs transcibed messages into an ingestion SQS queue. The application load 
balancer is fronted using a Cloudfront distribution.

It provides 3 endpoints:

1. /api/stt/healthcheck

    Returns a status code 200 with the message "Yes, I'm ok".

1. /api/stt/transcribe

    Websocket endpoint which receives audio input. The audio has to be encoded in PCM format and the query parameter sampleRate should match the audio streamed in.

1. /api/stt/connect

    Websocket endpoint which updates the connected clients every 10 seconds with messages processed in the last two minutes. The data is acquired from a DynamoDB table.

### Processing Pipeline

The processing pipeline starts with the ingestion SQS queue. It currently hosts one single Lambda Function which write transcriptions into a DynamoDB table. The Lambda Function 
and each next ones are built on the same container image running in NodeJS.
