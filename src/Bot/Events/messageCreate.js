module.exports = class MessageCreate {
	constructor (client) {
		this.client = client;
	}
	async run (message) {
		//console.log(this);
		console.log(message.content);
	}
};