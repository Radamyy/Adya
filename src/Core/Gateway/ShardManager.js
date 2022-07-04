const Shard = require('./Shard');

module.exports = class ShardManager extends Map {
	constructor(client) {
		super();
		this._client = client;
		this.connectQueue = [];
		this.connectTimeout = null;
	}

	add(shard) {
		this.set(shard.id, shard);
		return shard;
	}
	connect(shard) {
		this.connectQueue.push(shard);
		this.tryConnect();
	}

	spawn(id) {
		let shard = this.get(id);
		if (!shard) {
			shard = this.add(new Shard(id, this._client));
			shard
				.on('shardReady', () => {
					if (this._client.ready) {
						return;
					}
					for (const other of this.values()) {
						if (!other.ready) {
							return;
						}
					}
					this._client.ready = true;
					this._client.startTime = Date.now();
					this._client.emit('ready');
				})
				.on('resume', () => {
					this._client.emit('shardResume', shard.id);
					if (this._client.ready) {
						return;
					}
					for (const other of this.values()) {
						if (!other.ready) {
							return;
						}
					}
					this._client.ready = true;
					this._client.startTime = Date.now();
					this._client.emit('ready');
				})
				.on('disconnect', (error) => {
					this._client.emit('shardDisconnect', error, shard.id);
					for (const other of this.values()) {
						if (other.ready) {
							return;
						}
					}
					this._client.ready = false;
					this._client.startTime = 0;

					this._client.emit('disconnect');
				});
		}
		if (shard.status === 'disconnected') {
			return this.connect(shard);
		}
	}

	tryConnect() {
		// nothing in queue
		if (this.connectQueue.length === 0) {
			return;
		}

		// loop over the connectQueue
		for (const shard of this.connectQueue) {
			// connect the shard
			shard.connect();

			// remove the shard from the queue
			const index = this.connectQueue.findIndex((s) => s.id === shard.id);
			this.connectQueue.splice(index, 1);
		}

		// set the next timeout if we have more shards to connect
		if (!this.connectTimeout && this.connectQueue.length > 0) {
			this.connectTimeout = setTimeout(() => {
				this.connectTimeout = null;
				this.tryConnect();
			}, 500);
		}
	}
};


