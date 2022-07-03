module.exports = class Channel {
	constructor (apiChannel, client) {
		this._client = client;
		this.id = apiChannel.id;
		this.type = apiChannel.type;
		this.guildId = apiChannel.guild_id;
	}
	get guild () {
		return this._client.guilds.get(this.guildId);
	}

	createMessage(content, file) {
		return new Promise((res, rej) => {
			this._client.createMessage(this.id, content, file).then((m) => res(m)).catch(rej);
		});
	}
};