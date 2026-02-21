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
  StringSelectMenuBuilder,
  ChannelType
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

    orderCounter++;

    orders[orderCounter] = {
      collected: false,
      delivered: false,
      seller: null,
      service,
      price,
      userId: message.author.id,
      fromShop: false
    };

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setImage(BANNER_URL)
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 **Item:** ${service}
💰 **Price:** $${price}

🔹 **Order:** #${orderCounter}
🔹 **Seller:** None
🔹 **Status:** Pending

━━━━━━━━━━━━━━━━━━`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collect_${orderCounter}`)
        .setLabel("Collect")
        .setStyle(ButtonStyle.Success)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });
    orders[orderCounter].messageId = msg.id;
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

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "select_game") {

      if (interaction.values[0] === "wow")
        return createShopTicket(interaction, "WoW Service", 20);

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

        return interaction.update({
          content: "Select ARK Raiders Category:",
          components: [arkMenu]
        });
      }
    }

    if (interaction.customId === "select_ark_type") {

      const type = interaction.values[0];
      const serviceName = type === "items"
        ? "ARK Raiders Items"
        : "ARK Raiders Weapons";

      return createShopTicket(interaction, serviceName, 15);
    }
  }

  if (!interaction.isButton()) return;

  if (interaction.customId === "start_buy") {

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

  const [action, orderId] = interaction.customId.split("_");
  const order = orders[orderId];
  if (!order)
    return interaction.reply({ content: "❌ Order not found.", ephemeral: true });

  if (action === "collect") {

    await interaction.deferUpdate();

    order.collected = true;
    order.seller = interaction.user.id;

    if (!order.fromShop) {
      await openTicket(interaction.guild, orderId, order, interaction.user.id);
    }

    const msg = await interaction.channel.messages.fetch(order.messageId);

    const updated = new EmbedBuilder(msg.embeds[0])
      .setDescription(
`📦 Order #${orderId}

Item: ${order.service}
Price: $${order.price}

Seller: <@${order.seller}>
Status: Collected`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`delivered_${orderId}`)
        .setLabel("Delivered")
        .setStyle(ButtonStyle.Primary)
    );

    await msg.edit({ embeds: [updated], components: [row] });
  }

  if (action === "delivered") {

    await interaction.deferUpdate();
    order.delivered = true;

    const msg = await interaction.channel.messages.fetch(order.messageId);

    const updated = new EmbedBuilder(msg.embeds[0])
      .setDescription(
`📦 Order #${orderId}

Item: ${order.service}
Price: $${order.price}

Seller: <@${order.seller}>
Status: ~~Collected~~ → Delivered ✅`
      );

    await msg.edit({ embeds: [updated], components: [] });
  }

  if (action === "close") {

    await interaction.deferReply({ ephemeral: true });

    const closedCategory = interaction.guild.channels.cache.find(c => c.name === CLOSED_CATEGORY_NAME);
    if (!closedCategory)
      return interaction.editReply("❌ اعمل كاتيجوري 𝐂𝐋𝐎𝐒𝐄𝐃");

    await interaction.channel.setParent(closedCategory.id);
    await interaction.channel.setName(`closed-${orderId}`);

    await interaction.editReply("✅ تم نقل التيكت.");
  }
});

// ================= FUNCTIONS =================

async function createShopTicket(interaction, service, price) {

  orderCounter++;

  orders[orderCounter] = {
    collected: false,
    delivered: false,
    seller: null,
    service,
    price,
    userId: interaction.user.id,
    fromShop: true
  };

  await openTicket(interaction.guild, orderCounter, orders[orderCounter], null);

  await interaction.reply({
    content: `✅ Ticket created!`,
    ephemeral: true
  });
}

async function openTicket(guild, orderId, order, sellerId) {

  const category = guild.channels.cache.find(c => c.name === TICKET_CATEGORY_NAME);
  if (!category) return;

  const ticket = await guild.channels.create({
    name: `ticket-${orderId}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: order.userId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  });

  if (sellerId) {
    await ticket.permissionOverwrites.create(sellerId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`close_${orderId}`)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  await ticket.send({
    content: `<@${order.userId}>`,
    allowedMentions: { users: [order.userId] },
    embeds: [
      new EmbedBuilder()
        .setColor("#FFD700")
        .setDescription(
`📦 Order #${orderId}

Item: ${order.service}
Price: $${order.price}
Status: Pending`
        )
    ],
    components: [row]
  });
}

client.login(process.env.TOKEN);
