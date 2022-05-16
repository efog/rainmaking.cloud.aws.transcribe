FROM node:16 as builder
WORKDIR /usr/src/app/build
COPY src/package*.json .
RUN npm install
COPY src/ .
RUN npx tsc -p tsconfig.json
FROM node:16-alpine as runner
ENV AWS_DEFAULT_REGION=ca-central-1
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/build/package*.json .
RUN npm ci --only=production
COPY --from=builder /usr/src/app/build ./
CMD [ "node", "index.js" ]