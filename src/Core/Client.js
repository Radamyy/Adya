const { Routes } = require('discord-api-types/v10');
const { EventEmitter } = require('node:events');
const ShardManager = require('./Gateway/ShardManager');
const Rest = require('./Rest/RequestHandler');
const Collection = require('./Utils/Collection');
const Guild = require('./Classes/Guild');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = class Client extends EventEmitter {
	constructor(options) {
		super();
		this.options = options;
		this._token = options.token;
		this.options.reconnectDelay = (lastDelay, attempts) =>
			Math.pow(attempts + 1, 0.7) * 20000;
		this.shards = new ShardManager(this);
		this.rest = new Rest(this._token);
		this.guilds = new Collection(Guild);
	}

	async login() {
		try {
			const gateway = await this.getGateway();
			if (!this.options.shardCount) this.options.shardCount = gateway.shards;
			if (!this.options.firstShardId) this.options.firstShardId = 0;
			if (!this.options.lastShardId) this.options.lastShardId = gateway.shards - 1;
			for (let i = this.options.firstShardId; i <= this.options.lastShardId; ++i) {
				this.shards.spawn(i);
			}
		} catch (err) {
			if (!this.options.autoReconnect) {
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

	async getGateway() {
		return await this.rest.request('GET', Routes.gatewayBot());
	}

	async createMessage(channelId, content) {
		return await this.rest.request('POST', Routes.channelMessages(channelId), content);
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

	async setActivity(activity, shards) {
		if (!shards) shards = this.shards.map((shard) => shard.id);
		for (const id of shards) {
			await this.shards.get(id).setActivity(activity);
		}
	}
};
