# PictoBridge WebSocket protocol (draft v1)

This is the proposed local API between the Gandi extension and a bridge process. It is not the Nintendo DS radio protocol.

## Transport

- WebSocket endpoint: ws://127.0.0.1:8765 by default.
- One JSON object per WebSocket message.
- Each packet should include protocol: pictobridge-v1.
- Bind to loopback by default; do not expose an unauthenticated socket publicly.

## Client commands

### Listen

    {"protocol":"pictobridge-v1","type":"listen","channel":"A"}

Channel is one of A, B, C, or D.

### Send

    {"protocol":"pictobridge-v1","type":"send","channel":"A","username":"Gandi","text":"Hello"}

A bridge must validate the channel, username, text length, and DS protocol limits before attempting transmission. It should return an explicit status or error if sending is unsupported.

## Bridge events

### Message

    {"protocol":"pictobridge-v1","type":"message","channel":"A","username":"Guest","text":"Hi","timestamp":1790000000000,"people":2}

Required fields: type, username, and text. Channel, timestamp, and people are optional.

### Status

    {"protocol":"pictobridge-v1","type":"status","status":"Listening on channel A","people":2}

## Error handling

The bridge should send a status packet when an operation is unavailable, malformed, or unsupported by the installed radio adapter. The extension must never report a successful radio send merely because a command was queued over WebSocket.
