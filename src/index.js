const { Guilds, GuildMembers, MessageContent, GuildMessages } =
	GatewayIntentBits;
const { Client } = require('./Classes/Client');
const { GatewayIntentBits } = require('discord-api-types/v10');
const config = require('dotenv').config().parsed;

const client = new Client({
	token: config.TOKEN,
	firstShardId: 0,
	lastShardId: 1,
	shardCount: 2,
	autoreconnect: false,
	presence: {
		activities: [
			{
				name: 'Adya-core',
				type: 0,
			},
		],
		status: 'dnd',
		since: 91879201,
		afk: false,
	},
	intents: [Guilds, GuildMembers, MessageContent, GuildMessages],
});

client.login();
