const { Routes } = require('discord-api-types/v10');
const { EventEmitter } = require('node:events');
const { ShardManager } = require('./Gateway/ShardManager');
const { Rest } = require('./Rest');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class Client extends EventEmitter {
	constructor(options) {
		super();
		this.ready = false;
		this.options = options;
		this._token = options.token;
		this.options.reconnectDelay = (lastDelay, attempts) =>
			Math.pow(attempts + 1, 0.7) * 20000;
		this.shards = new ShardManager(this);
		this.rest = new Rest(this._token);
	}

	async login() {
		try {
			for (let i = this.options.firstShardId; i <= this.options.lastShardId; ++i) {
				this.shards.spawn(i);
			}
		} catch (err) {
			if (!this.options.autoreconnect) {
				throw err;
			}
			const reconnectDelay = this.options.reconnectDelay(
				this.lastReconnectDelay,
				this.reconnectAttempts
			);
			await sleep(reconnectDelay);
			this.lastReconnectDelay = reconnectDelay;
			this.reconnectAttempts = this.reconnectAttempts + 1;
			return this.login();
		}
	}

	async createMessage(channelId, message) {
		return await this.rest.request('POST', Routes.channelMessages(channelId), message);
	}

	async deleteMessage(channelId, messageId) {
		return await this.rest.request('DELETE', Routes.channelMessage(channelId, messageId));
	}

	async editMessage(channelId, messageId, message) {
		return await this.rest.request(
			'PATCH',
			Routes.channelMessage(channelId, messageId),
			message
		);
	}
}

module.exports = { Client };
