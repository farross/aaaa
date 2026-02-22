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

const pool = require('./db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const STORE_NAME = "BOOSTFIY";
const OWNER_ROLE_NAME = "ᴼᵂᴺᴱᴿ";
const GAMERS_ROLE_ID = "1474625885062697161";
const ORDERS_CHANNEL_NAME = "〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦";
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";
const CLOSED_CATEGORY_NAME = "𝐂𝐋𝐎𝐒𝐄𝐃";

const BANNER_URL = "https://cdn.discordapp.com/attachments/963969901729546270/1474623270740561930/Yellow_Neon_Gaming_YouTube_Banner.png";

let orderCounter = 3000;
let orders = {};

client.once('ready', () => {
  console.log(`${STORE_NAME} Ready 👑`);
});

// ================= MESSAGE CREATE =================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!order")) {

    if (!message.member.roles.cache.some(r => r.name === OWNER_ROLE_NAME))
      return message.reply("❌ انت مش معاك صلاحية.");

    const args = message.content.slice(7).split("|");
    if (args.length < 2)
      return message.reply("❌ استخدم:\n!order اسم المنتج | السعر");

    const service = args[0].trim();
    const price = parseInt(args[1].replace("$","").trim());
    if (isNaN(price)) return message.reply("❌ السعر لازم رقم.");

    // ✅ يجيب روم الاوردرات
    const ordersChannel = message.guild.channels.cache.find(
      c => c.name === ORDERS_CHANNEL_NAME
    );

    if (!ordersChannel)
      return message.reply("❌ اعمل روم باسم 〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦");

    createOrderEmbed(ordersChannel, service, price, message.author.id);
  }

  if (message.content === "!store") {

    if (!message.member.roles.cache.some(r => r.name === OWNER_ROLE_NAME))
      return message.reply("❌ انت مش معاك صلاحية.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_buy")
        .setLabel("🛒 Buy")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({
      content: "## BOOSTFIY STORE 👑\nClick Buy to choose your game",
      components: [row]
    });
  }
});

// ================= INTERACTIONS =================

client.on('interactionCreate', async (interaction) => {

  // ===== START BUY =====
  if (interaction.isButton() && interaction.customId === "start_buy") {

    const gameMenu = new ActionRowBuilder().addComponents(
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
      components: [gameMenu],
      ephemeral: true
    });
  }

  // ===== SELECT MENUS =====
  if (interaction.isStringSelectMenu()) {

    await interaction.deferUpdate(); // ✅ حل interaction failed

    if (interaction.customId === "select_game") {

      if (interaction.values[0] === "ark") {

        const arkMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("select_ark_type")
            .setPlaceholder("Choose Category")
            .addOptions([
              { label: "Items", value: "items" },
              { label: "Weapons", value: "weapons" }
            ])
        );

        return interaction.editReply({
          content: "Select ARK Raiders Category:",
          components: [arkMenu]
        });
      }

      if (interaction.values[0] === "wow") {
        return createTicketOrder(interaction, "WoW Service", 20);
      }
    }

    if (interaction.customId === "select_ark_type") {

      const type = interaction.values[0];
      const serviceName =
        type === "items" ? "ARK Raiders Items" : "ARK Raiders Weapons";

      return createTicketOrder(interaction, serviceName, 15);
    }
  }

  if (!interaction.isButton()) return;

  const [action, orderId] = interaction.customId.split("_");
  const order = orders[orderId];
  if (!order) return;

  if (action === "collect") {

    await interaction.deferUpdate();

    order.collected = true;
    order.seller = interaction.user.id;

    const msg = await interaction.channel.messages.fetch(order.messageId);

    const updated = new EmbedBuilder(msg.embeds[0])
      .setDescription(
`📢 **𝐍𝐄𝐖 𝐎𝐑𝐃𝐄𝐑**

━━━━━━━━━━━━━━━━━━

🔸 **𝐃𝐄𝐓𝐀𝐈𝐋𝐒:** ~~${order.service}~~
💰 **𝐏𝐑𝐈𝐂𝐄:** ~~$${order.price}~~

🔹 **𝐎𝐑𝐃𝐄𝐑:** #${orderId}
🔹 **𝐒𝐄𝐋𝐋𝐄𝐑:** <@${order.seller}>

━━━━━━━━━━━━━━━━━━`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`delivered_${orderId}`)
        .setLabel("Delivered")
        .setStyle(ButtonStyle.Primary)
    );

    await msg.edit({ embeds: [updated], components: [row] });
  }

  if (action === "close") {

    await interaction.deferReply({ ephemeral: true });

    const closedCategory = interaction.guild.channels.cache.find(
      c => c.name === CLOSED_CATEGORY_NAME
    );

    await interaction.channel.setParent(closedCategory.id);
    await interaction.channel.setName(`closed-${orderId}`);

    await interaction.editReply("✅ Ticket moved to CLOSED");
  }
});

// ================= ORDER EMBED =================

async function createOrderEmbed(channel, service, price, userId) {

  orderCounter++;

  orders[orderCounter] = {
    collected: false,
    seller: null,
    service,
    price,
    userId
  };

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setDescription(
`📢 **𝐍𝐄𝐖 𝐎𝐑𝐃𝐄𝐑** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 **𝐃𝐄𝐓𝐀𝐈𝐋𝐒:** ${service}
💰 **𝐏𝐑𝐈𝐂𝐄:** $${price}

🔹 **𝐎𝐑𝐃𝐄𝐑:** #${orderCounter}
🔹 **𝐒𝐄𝐋𝐋𝐄𝐑:** None

━━━━━━━━━━━━━━━━━━`
    )
    .setImage(BANNER_URL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`collect_${orderCounter}`)
      .setLabel("Collect")
      .setStyle(ButtonStyle.Success)
  );

  const msg = await channel.send({
    embeds: [embed],
    components: [row]
  });

  orders[orderCounter].messageId = msg.id;
}

client.login(process.env.TOKEN);
