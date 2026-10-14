/* Local test server only. This simulates chat; it does not use DS radio hardware. */
"use strict";

const WebSocket = require("ws");

const HOST = "127.0.0.1";
const PORT = 8765;
const clients = new Map();
const server = new WebSocket.Server({ host: HOST, port: PORT });

function send(socket, packet) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({
    protocol: "pictobridge-v1",
    ...packet
  }));
}

function broadcast(channel, packet) {
  for (const [socket, state] of clients) {
    if (state.channel === channel && socket.readyState === WebSocket.OPEN) {
      send(socket, packet);
    }
  }
}

server.on("connection", (socket) => {
  clients.set(socket, { channel: "A" });
  send(socket, {
    type: "status",
    status: "Mock bridge connected (simulation only)",
    people: clients.size
  });

  socket.on("message", (raw) => {
    let packet;
    try {
      packet = JSON.parse(raw.toString());
    } catch (_) {
      send(socket, { type: "status", status: "Invalid JSON", people: clients.size });
      return;
    }

    if (!packet || packet.protocol !== "pictobridge-v1") {
      send(socket, { type: "status", status: "Unsupported protocol", people: clients.size });
      return;
    }

    if (packet.type === "listen") {
      const channel = String(packet.channel || "").toUpperCase();
      if (!["A", "B", "C", "D"].includes(channel)) {
        send(socket, { type: "status", status: "Invalid channel", people: clients.size });
        return;
      }
      clients.get(socket).channel = channel;
      send(socket, {
        type: "status",
        status: "Mock listening on channel " + channel + " (no DS radio)",
        people: clients.size
      });
      return;
    }

    if (packet.type === "send") {
      const state = clients.get(socket);
      const channel = String(packet.channel || state.channel).toUpperCase();
      const username = String(packet.username || "Gandi").slice(0, 32);
      const text = String(packet.text || "");
      if (!["A", "B", "C", "D"].includes(channel) || !text.trim() || text.length > 500) {
        send(socket, { type: "status", status: "Invalid message payload", people: clients.size });
        return;
      }
      broadcast(channel, {
        type: "message",
        channel,
        username,
        text,
        timestamp: Date.now(),
        people: clients.size
      });
      send(socket, {
        type: "status",
        status: "Simulated message delivered; no DS radio transmission occurred",
        people: clients.size
      });
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
    for (const [client] of clients) {
      send(client, { type: "status", status: "Mock bridge connected", people: clients.size });
    }
  });
});

server.on("listening", () => {
  console.log("PictoBridge MOCK server listening at ws://" + HOST + ":" + PORT);
  console.log("Simulation only: this does not connect to or transmit to a Nintendo DS.");
});

server.on("error", (error) => {
  console.error("Mock bridge failed:", error.message);
  process.exitCode = 1;
});
