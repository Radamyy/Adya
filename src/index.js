const { GatewayIntentBits, GatewayDispatchEvents } = require('discord-api-types/v10');
const Client = require('./Bot/Classes/Client');
const { Guilds, GuildMembers, MessageContent, GuildMessages } = GatewayIntentBits;
const { Ready, GuildCreate, GuildDelete, MessageCreate, GuildUpdate, InteractionCreate, MessageReactionAdd, MessageReactionRemove, PresenceUpdate, VoiceStateUpdate } = GatewayDispatchEvents;
const config = require('dotenv').config().parsed;

new Client({
	token: config.TOKEN,
	firstShardId: 0,
	lastShardId: 0,
	shardCount: 1,
	autoReconnect: true,
	intents: [
		Guilds,
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