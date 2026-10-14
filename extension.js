/* PictoBridge for Gandi IDE: browser client for a separate DS bridge. */
(function () {
  "use strict";
  const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:8765";
  const CHANNELS = [
    { text: "A", value: "A" }, { text: "B", value: "B" },
    { text: "C", value: "C" }, { text: "D", value: "D" }
  ];

  class PictoBridgeExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.socket = null;
      this.bridgeUrl = DEFAULT_BRIDGE_URL;
      this.channel = "A";
      this.messages = [];
      this.pendingNewMessages = 0;
      this.lastMessageText = "";
      this.lastMessageUser = "";
      this.people = 0;
      this.status = "Disconnected";
      this.maxMessages = 500;
    }

    getInfo() {
      return {
        id: "pictobridge", name: "PictoBridge",
        color1: "#3578C8", color2: "#245A9B", color3: "#173F70",
        blocks: [
          { opcode: "setBridgeUrl", blockType: "command", text: "set bridge URL to [URL]",
            arguments: { URL: { type: "string", defaultValue: DEFAULT_BRIDGE_URL } } },
          { opcode: "listen", blockType: "command", text: "start listening to channel [CHANNEL]",
            arguments: { CHANNEL: { type: "menu", menu: "channels", defaultValue: "A" } } },
          { opcode: "stopListening", blockType: "command", text: "stop listening" },
          { opcode: "sendMessage", blockType: "command", text: "send [MESSAGE] as username [USERNAME]",
            arguments: {
              MESSAGE: { type: "string", defaultValue: "Hello from Gandi!" },
              USERNAME: { type: "string", defaultValue: "Gandi" }
            } },
          { opcode: "appendLog", blockType: "command", text: "append latest message to list named [LISTNAME]",
            arguments: { LISTNAME: { type: "string", defaultValue: "PictoChat log" } } },
          { opcode: "peopleInRoom", blockType: "reporter", text: "people in room" },
          { opcode: "lastMessage", blockType: "reporter", text: "last PictoChat message" },
          { opcode: "lastMessageBy", blockType: "reporter", text: "last message sent by" },
          { opcode: "newMessage", blockType: "Boolean", text: "new message?" },
          { opcode: "connectionStatus", blockType: "reporter", text: "PictoBridge status" }
        ],
        menus: { channels: CHANNELS }
      };
    }

    setBridgeUrl(args) {
      const value = String(args.URL || "").trim();
      if (!/^wss?:\/\//i.test(value)) {
        this.status = "Invalid bridge URL (use ws:// or wss://)";
        return;
      }
      this.bridgeUrl = value;
      this.status = "Bridge URL set";
    }

    listen(args) {
      const channel = String(args.CHANNEL || "A").toUpperCase();
      if (!["A", "B", "C", "D"].includes(channel)) {
        this.status = "Invalid channel";
        return;
      }
      this.channel = channel;
      this.disconnectSocket();
      if (typeof WebSocket === "undefined") {
        this.status = "WebSocket is not supported in this browser";
        return;
      }
      this.status = "Connecting to " + this.bridgeUrl;
      try {
        const socket = new WebSocket(this.bridgeUrl);
        this.socket = socket;
        socket.addEventListener("open", () => {
          if (this.socket !== socket) return;
          this.status = "Connected; listening to channel " + this.channel;
          this.sendPacket({ type: "listen", channel: this.channel });
        });
        socket.addEventListener("message", (event) => {
          if (this.socket === socket) this.handleBridgeMessage(event.data);
        });
        socket.addEventListener("error", () => {
          if (this.socket === socket) this.status = "Bridge connection error";
        });
        socket.addEventListener("close", () => {
          if (this.socket === socket) {
            this.socket = null;
            this.status = "Disconnected";
          }
        });
      } catch (error) {
        this.status = "Could not connect: " + String(error && error.message || error);
        this.socket = null;
      }
    }

    stopListening() {
      this.disconnectSocket();
      this.status = "Disconnected";
    }

    disconnectSocket() {
      const oldSocket = this.socket;
      this.socket = null;
      if (oldSocket) {
        try { oldSocket.close(); } catch (_) {}
      }
    }

    sendPacket(packet) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.status = "Not connected to bridge";
        return false;
      }
      try {
        this.socket.send(JSON.stringify(Object.assign({ protocol: "pictobridge-v1" }, packet)));
        return true;
      } catch (error) {
        this.status = "Send failed: " + String(error && error.message || error);
        return false;
      }
    }

    sendMessage(args) {
      const message = String(args.MESSAGE == null ? "" : args.MESSAGE).trim();
      const username = String(args.USERNAME == null ? "Gandi" : args.USERNAME).trim().slice(0, 32) || "Gandi";
      if (!message) { this.status = "Message cannot be empty"; return; }
      if (message.length > 500) { this.status = "Message too long (maximum 500 characters)"; return; }
      this.sendPacket({ type: "send", channel: this.channel, username, text: message });
    }

    handleBridgeMessage(raw) {
      let packet;
      try { packet = typeof raw === "string" ? JSON.parse(raw) : raw; }
      catch (_) { this.status = "Bridge sent invalid JSON"; return; }
      if (!packet || typeof packet !== "object") return;
      if (packet.type === "status") {
        if (Number.isFinite(packet.people)) this.people = Math.max(0, Math.floor(packet.people));
        if (typeof packet.status === "string") this.status = packet.status;
        return;
      }
      if (packet.type !== "message") return;
      const message = {
        channel: String(packet.channel || this.channel),
        username: String(packet.username || "Unknown").slice(0, 32),
        text: String(packet.text == null ? "" : packet.text).slice(0, 500),
        timestamp: Number.isFinite(packet.timestamp) ? packet.timestamp : Date.now()
      };
      this.messages.push(message);
      if (this.messages.length > this.maxMessages) this.messages.shift();
      this.lastMessageText = message.text;
      this.lastMessageUser = message.username;
      this.pendingNewMessages += 1;
      if (Number.isFinite(packet.people)) this.people = Math.max(0, Math.floor(packet.people));
    }

    appendLog(args) {
      const listName = String(args.LISTNAME || "").trim();
      if (!listName || !this.messages.length) return;
      const m = this.messages[this.messages.length - 1];
      const line = "[" + m.channel + "] " + m.username + ": " + m.text;
      try {
        const targets = this.runtime && this.runtime.targets;
        if (!Array.isArray(targets)) {
          this.status = "List access unavailable in this extension sandbox";
          return;
        }
        for (const target of targets) {
          const blocks = target && target.blocks && target.blocks._blocks;
          if (!blocks || typeof blocks !== "object") continue;
          for (const block of Object.values(blocks)) {
            if (!block || block.opcode !== "data_listcontents" || !block.fields) continue;
            const field = block.fields.LIST;
            if (!field || String(field.value) !== listName) continue;
            const list = target.variables && target.variables[field.id];
            if (list && Array.isArray(list.value)) {
              list.value.push(line);
              this.status = "Appended message to list " + listName;
              return;
            }
          }
        }
        this.status = "List not found or list access unavailable: " + listName;
      } catch (_) {
        this.status = "Could not access project lists in this extension sandbox";
      }
    }

    peopleInRoom() { return this.people; }
    lastMessage() { return this.lastMessageText; }
    lastMessageBy() { return this.lastMessageUser; }
    newMessage() {
      if (this.pendingNewMessages > 0) { this.pendingNewMessages -= 1; return true; }
      return false;
    }
    connectionStatus() { return this.status; }
  }

  if (typeof window !== "undefined") {
    window.tempExt = {
      Extension: PictoBridgeExtension,
      info: {
        name: "PictoBridge",
        description: "Connect Gandi IDE to a separate Nintendo DS PictoChat bridge.",
        extensionId: "pictobridge",
        featured: false,
        disabled: false
      }
    };
  }
})();