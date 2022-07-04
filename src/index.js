const { GatewayIntentBits, GatewayDispatchEvents } = require('discord-api-types/v10');
const { Client } = require('./Core/Client');
const { Guilds, GuildMembers, MessageContent, GuildMessages } = GatewayIntentBits;
const { Ready, GuildCreate, GuildDelete, MessageCreate, GuildUpdate, InteractionCreate, MessageReactionAdd, MessageReactionRemove, PresenceUpdate, VoiceStateUpdate } = GatewayDispatchEvents;
const config = require('dotenv').config().parsed;

const client = new Client({
	token: config.TOKEN,
	firstShardId: 0,
	lastShardId: 1,
	shardCount: 2,
	autoreconnect: true,
	/*
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

	 */
	intents: [Guilds,
		GuildMembers,
		MessageContent,
		GuildMessages
	],
	events: [
		Ready,
		GuildCreate,
		GuildUpdate,
		GuildDelete,
		InteractionCreate,
		MessageCreate,
		MessageReactionAdd,
		MessageReactionRemove,
		PresenceUpdate,
		VoiceStateUpdate
	]
});

client.login();

client.on('ready', () => {
	console.log(`Load total of ${client.guilds.size} guilds in cache`);

	client.setActivity({
		activities: [
			{
				name: 'Adya-core',
				type: 0,
			},
		],
		status: 'dnd',
		since: 91879201,
		afk: false,
	}, [0, 1]).catch(console.error);

	/*
	client.createMessage('992905327039234128', {
		content: 'bip bop'
	}).catch(console.error);//.then(console.log);

	 */


});
