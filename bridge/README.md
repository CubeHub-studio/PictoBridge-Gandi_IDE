# Local mock bridge

This is a simulator for testing the Gandi extension before any real DS bridge exists. It only echoes messages between connected PictoBridge clients on the same channel. **It does not listen to or transmit Nintendo DS PictoChat traffic.**

## Requirements

- Node.js 18 or newer
- npm

From the repository root:

    npm install
    npm run mock-bridge

The server binds to 127.0.0.1:8765. In the extension, leave the bridge URL at ws://127.0.0.1:8765 and run the start-listening block. Sending a message should produce a simulated message event.

If Gandi is loaded from an HTTPS page and the browser blocks the insecure WebSocket, use a local test setup or configure a trusted WSS endpoint. Do not expose this mock server to the public internet.

## What this validates

- WebSocket connection and disconnection handling
- Channel selection
- JSON message parsing
- The new-message notification queue
- The message and username reporters

It does not validate DS radio protocol compatibility, real room membership counts, or real transmission.
