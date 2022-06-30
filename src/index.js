const { Client } = require('./classes/Client');
const config = require('dotenv').config().parsed;

const token = config.BOT_TOKEN;
const prefix = config.PREFIX;

const client = new Client(token, prefix);
client.connect();
