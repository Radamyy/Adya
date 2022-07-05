const Client = require('../../Core/Client');
const fs = require('fs');
const path = require('path');

module.exports = class ExtendedClient extends Client {
	constructor(options) {
		super(options);
	}

	async connect() {
		await this.login();

		// Loading events and commands after the bot is ready because in order to register commands we need the applicationId/botId
		// And the only way to get it is after the login of the bot

		this.on('ready', async () => {
			await this.handleCommands();
			await this.handleEvents();

			console.log(`[COMMAND] ${this.commands.size} command(s) loaded.`);
		});
	}

	async handleEvents() {
		this.on(
			'messageCreate',
			new (require('../Events/messageCreate'))(this).run.bind(this)
		);
		this.on('guildCreate', new (require('../Events/guildCreate'))(this).run.bind(this));
		this.on('guildDelete', new (require('../Events/guildDelete'))(this).run.bind(this));
	}

	async handleCommands() {
		//Getting the files in the 'Commands' directory
		const commandsDir = path.join(__dirname, '..', 'Commands');
		const commandsFiles = fs.readdirSync(commandsDir);

		//If nothing is in the 'Commands' directory, log an error and return
		if (!commandsFiles || commandsFiles.length < 1) {
			return console.log({
				commandsErrorMessage: '[COMMAND] No commands found in the commands directory.',
			});
		}

		//Map through all the files and requiring them to access the name, description and run properties
		//allCommandsAreValid is equal to false if one command doens't have all the necessery properties
		const allCommandsAreValid = commandsFiles
			.map((commandDir) => {
				const command = require(path.join(commandsDir, commandDir));

				//If no name log an error and return
				if (!command.name) {
					console.log(`[COMMAND] File '${commandDir}' must have a name property.`);
					return false;
				}

				//If no run() log an error and return
				if (!command.run) {
					console.log(`[COMMAND] File '${commandDir}' must have a run property.`);
					return false;
				}

				//If no description log an error and return
				if (!command.description) {
					console.log(`[COMMAND] File '${commandDir}' must have a description property.`);
					return false;
				}

				//Adding the command to 'commands' if it has all the right properties
				this.commands.set(command.name, {
					name: command.name,
					description: command.description,
					options: command.options,
					run: command.run,
				});

				return true;
			})
			.includes(false);

		//If dev mode is on, register the commands everttime the bot is online
		if (this.isEnvDev && !allCommandsAreValid) {
			const commandsToRegister = [];

			//Adding all the commands available to get them registered to the application
			this.commands.map(({ name, description, options }) => {
				commandsToRegister.push({ name, description, options });
			});

			//Pretty self explanatory
			await this.registerAllCommands(commandsToRegister, this.id)
				.then((data) => {
					console.log(`[COMMAND] ${data.length} command(s) registered to the bot`);
				})
				.catch((err) => {
					if (err?.data?.code === 50035) {
						console.log('[COMMAND] Invalid body format in the commands.');
					}
				});
		}
	}
};