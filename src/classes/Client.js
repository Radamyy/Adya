const {
	GatewayOpcodes,
	GatewayDispatchEvents,
} = require('discord-api-types/v10');
const { EventEmitter } = require('ws');
const WebSocket = require('ws');

class Client extends EventEmitter {
	constructor (token, prefix) {
		super();
		this.ws = null;
		this.token = token;
		this.prefix = prefix;
		this.onOpen = this.onOpen.bind(this);
		this.onMessage = this.onMessage.bind(this);
	}

	connect () {
		this.ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

		this.ws.on('open', this.onOpen);
		this.ws.on('message', this.onMessage);
	}

	onOpen () {
		this.ws.send(
			JSON.stringify({
				op: GatewayOpcodes.Identify,
				d: {
					token: this.token,
					intents: 513,
					properties: {
						os: process.platform,
						browser: 'chrome',
						device: 'chrome',
					},
				},
			})
		);
	}

	onMessage (payload) {
		try {
			if (Array.isArray(payload)) {
				const data = Buffer.concat(payload);
				return this.onPacket(JSON.parse(data.toString()));
			}

			return this.onPacket(JSON.parse(payload));
		} catch (err) {
			this.emit('error', err);
		}
	}

	onPacket ({ op, d, t }) {
		switch (op) {
		case GatewayOpcodes.Hello:
			this.heartbeat(d.heartbeat_interval);
			break;
		case GatewayOpcodes.InvalidSession:
			this.connect();
			break;
		}

		switch (t) {
		case GatewayDispatchEvents.MessageCreate:
			console.log(`${d.author.username}: ${d.content}`);
		}
	}

	heartbeat (interval) {
		setInterval(() => {
			this.ws.send(
				JSON.stringify({
					op: 1,
					d: 213,
				})
			);
		}, interval);
	}
}

module.exports = { Client };
