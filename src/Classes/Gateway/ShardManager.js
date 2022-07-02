const { Shard } = require('./Shard');

class ShardManager extends Map {
	constructor(client) {
		super();
		this._client = client;
		this.connectQueue = [];
		this.connectTimeout = null;
	}

	add(shard) {
		this.set(this.values().length ? this.values().length + 1 : 0, shard);
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
}

module.exports = { ShardManager };
