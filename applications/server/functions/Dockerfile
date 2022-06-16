FROM public.ecr.aws/lambda/nodejs:14-arm64  AS builder
WORKDIR /var/task
COPY package*.json tsconfig.json ./
RUN npm install
RUN npm install -g typescript
COPY ./src ./src/
RUN npm run build
FROM public.ecr.aws/lambda/nodejs:14-arm64 
WORKDIR /var/task
COPY package*.json ./
RUN npm install --only=prod
COPY --from=builder /var/task/src /var/task/
CMD [ "/var/task/index.handlers.handleMessageEvent" ]