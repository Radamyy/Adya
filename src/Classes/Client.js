const { EventEmitter } = require('node:events');
const { ShardManager } = require('./Gateway/ShardManager');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class Client extends EventEmitter {
	constructor(options) {
		super();
		this.options = options;
		this._token = options.token;
		this.options.reconnectDelay = (lastDelay, attempts) =>
			Math.pow(attempts + 1, 0.7) * 20000;
		this.shards = new ShardManager(this);
	}

	async login() {
		try {
			for (
				let i = this.options.firstShardId;
				i <= this.options.lastShardId;
				++i
			) {
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
}

module.exports = { Client };
