module.exports = class GuildDelete {
	constructor (client) {
		this.client = client;
	}
	async run (guild) {
		console.log('Left', guild.id);
	}
};