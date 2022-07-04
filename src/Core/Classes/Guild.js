const Channel = require('./Channel');
const Collection = require('../Utils/Collection');
module.exports = class Guild {
	constructor (apiGuild, client) {
		this._client = client;
		this.id = apiGuild.id;
		this.shardId = apiGuild.shard_id;
		this.name = apiGuild.name;
		this.icon = apiGuild.icon;
		this.ownerID = apiGuild.owner_id;
		this.vanityURLCode = apiGuild.vanity_url_code;
		this.boostStatus = {
			count: apiGuild.premium_subscription_count,
			tier: apiGuild.premium_tier
		};
		this.locale = apiGuild.preferred_locale;
		this.memberCount = apiGuild.member_count;
		this.large = apiGuild.large;
		this.unavailable = apiGuild.unavailable;
		this.channels = new Collection(Channel);
		this.resolveChannels(apiGuild.channels);
	}

	resolveChannels (channels) {
		for (const channel of channels) {
			this.channels.add(channel);
		}
	}
};