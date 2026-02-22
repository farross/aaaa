require('./db');
require('./dashboard');

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const OWNER_ROLE_NAME = "ᴼᵂᴺᴱᴿ";
const GAMERS_ROLE_ID = "1474625885062697161";
const ORDERS_CHANNEL_NAME = "〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦";
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";
const CLOSED_CATEGORY_NAME = "𝐂𝐋𝐎𝐒𝐄𝐃";

let orderCounter = 3600;
let orders = {};

client.once('ready', () => {
  console.log("BOOSTFIY Ready 👑");
});

// ======================= MESSAGE =======================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!order")) {

    if (!message.member.roles.cache.some(r => r.name === OWNER_ROLE_NAME))
      return message.reply("❌ انت مش معاك صلاحية.");

    const args = message.content.slice(7).split("|");
    if (args.length < 3)
      return message.reply("❌ استخدم:\n!order name | price$ | code");

    const service = args[0].trim();
    const price = args[1].trim();
    const code = args[2].trim();

    // ✅ يخلي الاوردر ينزل في روم 〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦
    const ordersChannel = message.guild.channels.cache.find(
      c => c.name === ORDERS_CHANNEL_NAME
    );

    if (!ordersChannel)
      return message.reply("❌ اعمل روم باسم 〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦");

    orderCounter++;

    orders[orderCounter] = {
      service,
      price,
      code,
      client: message.author.id,
      seller: null,
      messageId: null
    };

    // ✅ شكل مطابق للصورة
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 **Details:** ${service}

💠 **Order:** #${orderCounter}
👤 **Seller:** None

━━━━━━━━━━━━━━━━━━`
      )
      .setImage("https://cdn.discordapp.com/attachments/976992409219133530/1474879330147635350/1.png");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collect_${orderCounter}`)
        .setLabel("Order Now")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`manage_${orderCounter}`)
        .setLabel("Manage")
        .setStyle(ButtonStyle.Secondary)
    );

    const msg = await ordersChannel.send({
      embeds: [embed],
      components: [row]
    });

    orders[orderCounter].messageId = msg.id;
  }

  if (message.content === "!store") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_start")
        .setLabel("🛒 Buy")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({
      content: "## BOOSTFIY STORE 👑",
      components: [row]
    });
  }
});

// باقي الكود زي ما هو بدون أي تغيير 👇

client.on('interactionCreate', async (interaction) => {

  if (interaction.isButton() && interaction.customId === "buy_start") {

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_game")
        .setPlaceholder("Choose Game")
        .addOptions([
          { label: "WoW", value: "wow" },
          { label: "ARK Raiders", value: "ark" }
        ])
    );

    return interaction.reply({
      content: "Select Game:",
      components: [menu],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "select_game") {

      if (interaction.values[0] === "ark") {

        const arkMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("select_ark")
            .setPlaceholder("Choose Category")
            .addOptions([
              { label: "Items", value: "items" },
              { label: "Weapons", value: "weapons" }
            ])
        );

        return interaction.update({
          content: "Choose ARK Category:",
          components: [arkMenu]
        });
      }

      if (interaction.values[0] === "wow") {
        return createShopTicket(interaction, "WoW Service", "20$");
      }
    }

    if (interaction.customId === "select_ark") {

      const type = interaction.values[0];
      const name = type === "items"
        ? "ARK Raiders Items"
        : "ARK Raiders Weapons";

      return createShopTicket(interaction, name, "15$");
    }
  }

  // باقي اللوجيك زي ما هو
});
