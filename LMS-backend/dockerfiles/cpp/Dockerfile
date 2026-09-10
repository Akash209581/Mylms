FROM alpine:3.19
RUN apk add --no-cache g++ musl-dev libc-dev
RUN adduser -D -u 1000 sandbox
USER sandbox
WORKDIR /workspace
