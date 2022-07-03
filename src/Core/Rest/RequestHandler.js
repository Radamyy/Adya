const { RouteBases } = require('discord-api-types/v10');

const axios = require('axios').default;

module.exports = class RequestHandler {
	constructor(token) {
		this.token = token;
		this.axios = axios.create({
			baseURL: RouteBases.api,
			headers: {
				Authorization: `Bot ${this.token}`,
			},
		});
	}

	async request(method, url, data, headers) {
		return await this.axios.request({
			url,
			method: method.toLowerCase(),
			data,
			headers,
		});
	}
};
