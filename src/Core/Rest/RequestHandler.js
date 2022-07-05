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
		return new Promise((res, rej) => {
			this.axios
				.request({
					url,
					method: method.toLowerCase(),
					data,
					headers,
				})
				.then(({ data }) => res(data))
				.catch((e) => {
					if (e?.response?.status !== 429) return rej(e.response);

					const cooldown = e.response.data.retry_after;

					setTimeout(() => this.request(method, url, data, headers), cooldown * 1000);
				});
		});
	}
};
