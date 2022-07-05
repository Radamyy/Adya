const { GatewayIntentBits, GatewayDispatchEvents } = require('discord-api-types/v10');
const Client = require('./Bot/Classes/Client');
const { Guilds, GuildMembers, MessageContent, GuildMessages } = GatewayIntentBits;
const { Ready, GuildCreate, GuildDelete, MessageCreate, GuildUpdate, InteractionCreate, MessageReactionAdd, MessageReactionRemove, PresenceUpdate, VoiceStateUpdate } = GatewayDispatchEvents;
const config = require('dotenv').config().parsed;

const client = new Client({
	token: config.TOKEN,
	isEnvDev: config.IS_ENV_DEV,
	firstShardId: 0,
	lastShardId: 0,
	shardCount: 1,
	autoReconnect: true,
	intents: [Guilds, GuildMembers, MessageContent, GuildMessages],
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
		VoiceStateUpdate,
	],
});

//client.on('shardPreReady', (id) => console.log(`[SHARD] Shard(${id}) is starting`));
client.on('shardReady', (id) => console.log(`[SHARD] Shard(${id}) is ready`));

client.on('ready', (client) => {
	console.log(`[CLIENT] The bot is running on ${client.guilds.size} servers.`);

	client.setActivity({
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

client.connect();