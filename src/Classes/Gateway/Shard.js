/* eslint-disable no-case-declarations */
const WebSocket = require('ws');
const { EventEmitter } = require('node:events');
const { GatewayOpcodes, GatewayDispatchEvents } = require('discord-api-types/v10');

class Shard extends EventEmitter {
	constructor(id, client) {
		super();
		this.id = id;
		this._client = client;
		this.connectionTimeout = 3e5;
		this.status = 'disconnected';
		this.heartbeatInterval = 0;
		this.guildsQueue = [];

		this.onOpen = this.onOpen.bind(this);
		this.handleMessage = this.handleMessage.bind(this);
		this.onClose = this.onClose.bind(this);
		this.onError = this.onError.bind(this);
		this.onPacket = this.onPacket.bind(this);

		this.hardReset();
	}

	connect() {
		if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
			this.emit('error', new Error('Existing connection detected'), this.id);
			return;
		}
		++this.connectAttempts;
		this.connecting = true;
		return this.initWs();
	}

	async initWs() {
		this.status = 'connecting';
		this.ws = new WebSocket('wss://gateway.discord.gg/?v10@encoding=json');
		this.ws.on('open', this.onOpen);
		this.ws.on('message', this.handleMessage);
		this.ws.on('error', this.onError);
		this.ws.on('close', this.onClose);
		this.connectTimeout = setTimeout(() => {
			if (this.connecting) {
				this.disconnect(
					{
						reconnect: 'auto',
					},
					new Error('Connection timeout')
				);
			}
		}, this.connectionTimeout);
	}

	identify() {
		this.status = 'identifying';
		const identify = {
			token: this._token,
			v: 10,
			compress: false,
			large_threshold: 250,
			intents: this._client.options.intents.reduce((a, b) => a | b, 0),
			properties: {
				os: process.platform,
				browser: 'Adya-core',
				device: 'Adya-core',
			},
		};

		identify.shard = [this.id, this._client.options.shardCount];

		if (this._client.options.presence.status) {
			identify.presence = this._client.options.presence;
		}
		this.sendWS(GatewayOpcodes.Identify, identify);
	}

	handleMessage(data) {
		try {
			if (Array.isArray(data)) {
				// Fragmented messages
				data = Buffer.concat(data); // Copyfull concat is slow, but no alternative
			}
			return this.onPacket(JSON.parse(data.toString()));
		} catch (err) {
			this.emit('error', err, this.id);
		}
	}

	onOpen() {
		this.status = 'handshaking';
		this.emit('connect', this.id);
		this.lastHeartbeatAck = true;
	}

	emit(event, ...args) {
		this._client.emit.call(this._client, event, ...args);
		if (event !== 'error' || this.listeners('error').length > 0) {
			super.emit.call(this, event, ...args);
		}
	}

	wsEvent({ d, t }) {
		switch (t) {
		case GatewayDispatchEvents.Ready:
			//Here, I'm adding all the guild Ids to "guildsQueue" that need to be checked after in the "guildCreate" event
			const guilds = d.guilds;

			guilds.map((guild) => this.guildsQueue.push(guild.id));
			break;
		case GatewayDispatchEvents.GuildCreate:
			this.emit('guildCreate', d, this.id);

			const id = d.id;

			/**
				What we're doing here is simple, we loop through "guildsQueue" to check if the actual guildId of the event (d.id) is in the array.
				If it is, we are deleting it from the queue, and if the guildsQueue.length == 0, that means that the shard has loaded and cached all the guilds and is now ready.
				If the guildsQueue.length != 0, thats means that all the guilds of the shards haven't been loaded.
				Simple right?
			**/

			/**
				If nothing in the queue, we  do nothing
				This is useful because sometimes, the bot may be invited after all the shards are online
				And the bot joining a server triggers a guildCreate event, and we don't want to emit the shardReady we it gets invited, because the shard is ALREADY ready (in theory)
			**/
			if (this.guildsQueue.length == 0) return;

			for (let i = 0; i < this.guildsQueue.length; i++) {
				//If the id is equal to one id in guildsQueue, that means that it's the first time the server is getting loaded by the shard
				if (this.guildsQueue[i] == id) {
					//Now that we know that guild is loaded, we need to remove its id from the queue.
					const index = this.guildsQueue.indexOf(id);
					this.guildsQueue.splice(index, 1);
				}
			}

			//If after removing an id the queue is still full, we return, if it's empty that means that the guilds are now loaded and the shard truely ready!
			if (this.guildsQueue.length != 0) return;

			this.emit('shardReady', this.id);

			break;
		case GatewayDispatchEvents.GuildUpdate:
			this.emit('guildUpdate', d, this.id);
			break;
		case GatewayDispatchEvents.GuildDelete:
			this.emit('guildDelete', d, this.id);
			break;
		case GatewayDispatchEvents.InteractionCreate:
			this.emit('interactionCreate', d, this.id);
			break;
		case GatewayDispatchEvents.MessageCreate:
			this.emit('messageCreate', d, this.id);
			break;
		case GatewayDispatchEvents.MessageReactionAdd:
			this.emit('messageReactionAdd', d, this.id);
			break;
		case GatewayDispatchEvents.MessageReactionRemove:
			this.emit('messageReactionRemove', d, this.id);
			break;
		case GatewayDispatchEvents.PresenceUpdate:
			this.emit('presenceUpdate', d, this.id);
			break;
		case GatewayDispatchEvents.VoiceStateUpdate:
			this.emit('voiceStateUpdate', d, this.id);
			break;
		default:
			return null;
		}
	}

	onPacket({ s, d, t, op }) {
		if (s) {
			if (s > this.seq + 1 && this.ws && this.status !== 'resuming') {
				this.emit('warn', `Non-consecutive sequence (${this.seq} -> ${s})`, this.id);
			}
			this.seq = s;
		}
		switch (op) {
		case GatewayOpcodes.Dispatch: {
			this.wsEvent({ s, d, t, op });
			break;
		}
		case GatewayOpcodes.Heartbeat: {
			this.heartbeat();
			break;
		}
		case GatewayOpcodes.InvalidSession: {
			this.seq = 0;
			this.sessionID = null;
			this.emit('warn', 'Invalid session, reidentifying!', this.id);
			this.identify();
			break;
		}
		case GatewayOpcodes.Reconnect: {
			this.emit('debug', 'Reconnecting due to server request', this.id);
			this.disconnect({
				reconnect: 'auto',
			});
			break;
		}
		case GatewayOpcodes.Hello: {
			if (d.heartbeat_interval > 0) {
				if (this.heartbeatInterval) {
					clearInterval(this.heartbeatInterval);
				}
				this.heartbeatInterval = setInterval(
					() => this.heartbeat(true),
					d.heartbeat_interval
				);
			}

			this.discordServerTrace = d._trace;
			this.connecting = false;
			if (this.connectTimeout) {
				clearTimeout(this.connectTimeout);
			}
			this.connectTimeout = null;

			if (this.sessionID) {
				this.resume();
			} else {
				this.identify();
				// Cannot heartbeat when resuming, discord/discord-api-docs#1619
				this.heartbeat();
			}
			break;
		}
		case GatewayOpcodes.HeartbeatAck: {
			this.lastHeartbeatAck = true;
			this.lastHeartbeatReceived = Date.now();
			this.latency = this.lastHeartbeatReceived - this.lastHeartbeatSent;
			break;
		}
		default: {
			this.emit('unknown', { s, d, t, op }, this.id);
			break;
		}
		}
	}

	heartbeat(normal) {
		// Can only heartbeat after identify/resume succeeds, session will be killed otherwise, discord/discord-api-docs#1619
		if (this.status === 'resuming' || this.status === 'identifying') {
			return;
		}
		if (normal) {
			if (!this.lastHeartbeatAck) {
				this.emit(
					'debug',
					'Heartbeat timeout; ' +
						JSON.stringify({
							lastReceived: this.lastHeartbeatReceived,
							lastSent: this.lastHeartbeatSent,
							interval: this.heartbeatInterval,
							status: this.status,
							timestamp: Date.now(),
						})
				);
				return this.disconnect(
					{
						reconnect: 'auto',
					},
					new Error(
						'Server didn\'t acknowledge previous heartbeat, possible lost connection'
					)
				);
			}
			this.lastHeartbeatAck = false;
		}
		this.lastHeartbeatSent = Date.now();
		this.sendWS(GatewayOpcodes.Heartbeat, this.seq, true);
	}

	sendWS(op, _data) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			const data = JSON.stringify({ op: op, d: _data });
			this.ws.send(data);
			if (_data.token) {
				delete _data.token;
			}
			this.emit('debug', JSON.stringify({ op: op, d: _data }), this.id);
		}
	}

	disconnect(options = {}, error) {
		if (!this.ws) {
			return;
		}

		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		if (this.ws.readyState !== WebSocket.CLOSED) {
			this.ws.removeListener('message', this.handleMessage);
			this.ws.removeListener('close', this.onClose);
			try {
				if (options.reconnect && this.sessionID) {
					if (this.ws.readyState === WebSocket.OPEN) {
						this.ws.close(4901, 'Adya-core: reconnect');
					} else {
						this.emit(
							'debug',
							`Terminating websocket (state: ${this.ws.readyState})`,
							this.id
						);
						this.ws.terminate();
					}
				} else {
					this.ws.close(1000, 'Adya-core: normal');
				}
			} catch (err) {
				this.emit('error', err, this.id);
			}
		}
		this.ws = null;
		this.reset();

		if (error) {
			this.emit('error', error, this.id);
		}

		super.emit('disconnect', error);

		if (options.reconnect === 'auto') {
			if (this.sessionID) {
				this.emit(
					'debug',
					`Immediately reconnecting for potential resume | Attempt ${this.connectAttempts}`,
					this.id
				);
				this._client.shards.connect(this);
			} else {
				this.emit(
					'debug',
					`Queueing reconnect in ${this.reconnectInterval}ms | Attempt ${this.connectAttempts}`,
					this.id
				);
				setTimeout(() => {
					this._client.shards.connect(this);
				}, this.reconnectInterval);
				this.reconnectInterval = Math.min(
					Math.round(this.reconnectInterval * (Math.random() * 2 + 1)),
					30000
				);
			}
		} else if (!options.reconnect) {
			this.hardReset();
		}
	}

	resume() {
		this.status = 'resuming';
		this.sendWS(GatewayOpcodes.Resume, {
			token: this._token,
			session_id: this.sessionID,
			seq: this.seq,
		});
	}

	onClose(code, reason) {
		reason = reason.toString();
		this.emit(
			'debug',
			'WS disconnected: ' +
				JSON.stringify({
					code: code,
					reason: reason,
					status: this.status,
				})
		);
		let err = !code || code === 1000 ? null : new Error(code + ': ' + reason);
		let reconnect = 'auto';
		if (code) {
			this.emit(
				'debug',
				`${code === 1000 ? 'Clean' : 'Unclean'} WS close: ${code}: ${reason}`,
				this.id
			);
			if (code === 4001) {
				err = new Error('Gateway received invalid OP code');
			} else if (code === 4002) {
				err = new Error('Gateway received invalid message');
			} else if (code === 4003) {
				err = new Error('Not authenticated');
				this.sessionID = null;
			} else if (code === 4004) {
				err = new Error('Authentication failed');
				this.sessionID = null;
				reconnect = false;
				this.emit('error', new Error(`Invalid token: ${this._token}`));
			} else if (code === 4005) {
				err = new Error('Already authenticated');
			} else if (code === 4006 || code === 4009) {
				err = new Error('Invalid session');
				this.sessionID = null;
			} else if (code === 4007) {
				err = new Error('Invalid sequence number: ' + this.seq);
				this.seq = 0;
			} else if (code === 4008) {
				err = new Error('Gateway connection was ratelimited');
			} else if (code === 4010) {
				err = new Error('Invalid shard key');
				this.sessionID = null;
				reconnect = false;
			} else if (code === 4011) {
				err = new Error('Shard has too many guilds (>2500)');
				this.sessionID = null;
				reconnect = false;
			} else if (code === 4013) {
				err = new Error('Invalid intents specified');
				this.sessionID = null;
				reconnect = false;
			} else if (code === 4014) {
				err = new Error('Disallowed intents specified');
				this.sessionID = null;
				reconnect = false;
			} else if (code === 1006) {
				err = new Error('Connection reset by peer');
			} else if (code !== 1000 && reason) {
				err = new Error(code + ': ' + reason);
			}
			if (err) {
				err.code = code;
			}
		} else {
			this.emit('debug', 'WS close: unknown code: ' + reason, this.id);
		}
		this.disconnect(
			{
				reconnect,
			},
			err
		);
	}

	onError(err) {
		this.emit('error', err, this.id);
	}

	reset() {
		this.connecting = false;
		this.ready = false;
		this.preReady = false;
		this.latency = Infinity;
		this.lastHeartbeatAck = true;
		this.lastHeartbeatReceived = null;
		this.lastHeartbeatSent = null;
		this.status = 'disconnected';
		if (this.connectTimeout) {
			clearTimeout(this.connectTimeout);
		}
	}

	hardReset() {
		this.reset();
		this.seq = 0;
		this.sessionID = null;
		this.reconnectInterval = 1000;
		this.connectAttempts = 0;
		this.ws = null;
		this.heartbeatInterval = null;
		Object.defineProperty(this, '_token', {
			configurable: true,
			enumerable: false,
			writable: true,
			value: this._client._token,
		});
	}
}

module.exports = { Shard };
