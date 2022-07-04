const Client = require('../../Core/Client');
module.exports = class ExtendedClient extends Client {
	constructor (options) {
		super(options);
		this.connect().catch(console.error);
	}

	async connect () {
		await this.login();
		await this.handleEvents(this);

		this.on('shardPreReady', (id) => console.log(`[SHARD] Shard ${id} is starting`));

		this.on('shardReady', (id) => console.log(`[SHARD] Shard ${id} is ready`));

		this.on('ready', () => {
			console.log(`[CLIENT] The bot is running on ${this.guilds.size} servers.`);
			this.setActivity({
				activities: [
					{
						name: 'Adya Bot',
						type: 0,
					},
				],
				status: 'dnd',
				since: 91879201,
				afk: false,
			});
		});


	}

	handleEvents (client) {
		this.on('messageCreate', new (require('../Events/messageCreate'))(client).run.bind(this));
		this.on('guildCreate', new (require('../Events/guildCreate'))(client).run.bind(this));
		this.on('guildDelete', new (require('../Events/guildDelete'))(client).run.bind(this));
	}
};