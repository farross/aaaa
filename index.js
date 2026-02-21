const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const STORE_NAME = "BOOSTFIY";
const STAFF_ROLE_NAME = "Staff";
const GAMERS_ROLE_ID = "1474625885062697161";

const BANNER_URL = "https://cdn.discordapp.com/attachments/963969901729546270/1474623270740561930/Yellow_Neon_Gaming_YouTube_Banner.png";

let orderCounter = 3000;
let orders = {};

client.once('clientReady', () => {
  console.log(`${STORE_NAME} Ready 👑`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!order")) {

    const details = message.content.slice(7).trim();
    if (!details) return message.reply("اكتب تفاصيل الأوردر بعد !order");

    orderCounter++;

    orders[orderCounter] = {
      collected: false,
      seller: null
    };

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setImage(BANNER_URL)
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 **Details:** ${details}

🔹 **Order:** #${orderCounter}
🔹 **Seller:** None

━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: `${STORE_NAME} • Premium Gaming Services` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`collect_${orderCounter}`)
          .setLabel("Collect")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`manage_${orderCounter}`)
          .setLabel("Manage")
          .setStyle(ButtonStyle.Secondary)
      );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.login(process.env.TOKEN);