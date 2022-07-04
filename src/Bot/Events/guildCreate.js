module.exports = class GuildCreate {
	constructor (client) {
		this.client = client;
	}
	async run (guild) {
		console.log('Joined', guild.id);
	}
};