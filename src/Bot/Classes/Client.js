const Client = require('../../Core/Client');

module.exports = class ExtendedClient extends Client {
	constructor(options) {
		super(options);
	}

	async connect() {
		this.handleEvents(this);
		await this.login();
	}

	handleEvents(client) {
		this.on(
			'messageCreate',
			new (require('../Events/messageCreate'))(client).run.bind(this)
		);
		this.on('guildCreate', new (require('../Events/guildCreate'))(client).run.bind(this));
		this.on('guildDelete', new (require('../Events/guildDelete'))(client).run.bind(this));
	}
};