# PictoBridge for Gandi IDE

A Gandi IDE extension client intended to connect project blocks to a separate bridge for a real Nintendo DS running original PictoChat.

**Status: early prototype.** This repository contains the Gandi-side client and a proposed WebSocket message contract. It does not yet implement Nintendo DS wireless packet capture or transmission. Browser JavaScript cannot directly capture arbitrary Wi-Fi frames; real DS protocol behavior still needs research and testing with actual hardware.

## Try the extension

The extension file is extension.js and uses the window.tempExt registration format used by Gandi/CCW remote extensions.

For a remote extension loading guide, see:
https://github.com/Gandi-IDE/custom-extension

The default bridge endpoint is ws://127.0.0.1:8765. A compatible bridge process must be running for connect/send actions to work. A page served over HTTPS may block an insecure ws:// connection; use a trusted local setup with wss:// where required. Do not expose an unauthenticated bridge to the public internet.

## Blocks included

- set bridge URL to [URL]
- start listening to channel [A/B/C/D]
- stop listening
- send [MESSAGE] as username [USERNAME]
- append latest message to list named [LISTNAME]
- people in room
- last PictoChat message
- last message sent by
- new message?
- PictoBridge status

The new-message reporter queues arrivals so bursts do not collapse into one notification. Each evaluation returning true consumes one pending notification.

## Project lists

Remote Gandi extensions can be sandboxed without access to the VM or project lists. The list-append block attempts a guarded lookup only when the host exposes runtime list structures; it reports a status error when it cannot. It takes a list name as text rather than pretending it can dynamically enumerate project lists.

## WebSocket bridge protocol: pictobridge-v1

The bridge is responsible for actual DS hardware/protocol work. It should accept JSON messages from the extension and return JSON messages to it.

Client listen command:

    {"protocol":"pictobridge-v1","type":"listen","channel":"A"}

Client send command:

    {"protocol":"pictobridge-v1","type":"send","channel":"A","username":"Gandi","text":"Hello from Gandi!"}

Bridge message event:

    {"protocol":"pictobridge-v1","type":"message","channel":"A","username":"Guest","text":"Hi!","timestamp":1790000000000,"people":2}

Bridge status event:

    {"protocol":"pictobridge-v1","type":"status","status":"Listening on channel A","people":2}

Timestamp is optional Unix time in milliseconds. People count is optional. The client accepts message text up to 500 characters and usernames up to 32 characters. This is an initial interface proposal, not a claim that DS radio packets already map to these fields.

## Development roadmap

1. Validate that the extension loads in the target Gandi IDE build.
2. Add a local WebSocket test bridge and automated tests for message queues and malformed packets.
3. Investigate the DS PictoChat radio protocol and hardware requirements using lawful captures from owned hardware.
4. Implement receive/transmit in a bridge only after the packet format and required radio capabilities are confirmed.
5. Revisit list integration against actual Gandi sandbox/runtime behavior.

## Privacy and safety

PictoBridge has no hosted relay, telemetry, or credential collection. Keep any future bridge bound to localhost by default, validate incoming payloads, and do not accept arbitrary network clients without authentication.

## Test without a DS bridge

A simulator is included in bridge/mock-bridge.js. With Node.js 18+ installed, run:

    npm install
    npm run mock-bridge

It listens only on 127.0.0.1:8765 and echoes simulated messages to connected clients on the same channel. This is useful for checking the extension's WebSocket and block behavior, but it does not connect to a DS or transmit radio packets. See bridge/README.md for details.
