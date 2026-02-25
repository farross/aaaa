const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// استدعاء السيستمات
require('./advancedOrderSystem')(client);
require('./ratingSystem')(client);
require('./rulesPanel')(client);
require("./shopSystem")(client);
require('./musicSystem')(client);

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);





