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
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";
const CLOSED_CATEGORY_NAME = "𝐂𝐋𝐎𝐒𝐄𝐃";

const BANNER_URL = "https://cdn.discordapp.com/attachments/963969901729546270/1474623270740561930/Yellow_Neon_Gaming_YouTube_Banner.png";

let orderCounter = 3000;
let orders = {};

// ================= STORE DATA =================

const STORE_ITEMS = {
  fortnite: [
    { label: "1000 V-Bucks - $5", service: "1000 V-Bucks", price: 5 },
    { label: "2500 V-Bucks - $10", service: "2500 V-Bucks", price: 10 }
  ],
  valorant: [
    { label: "1000 VP - $8", service: "1000 VP", price: 8 },
    { label: "2000 VP - $15", service: "2000 VP", price: 15 }
  ]
};

client.once('ready', () => {
  console.log(`${STORE_NAME} Ready 👑`);
});

// ================= MESSAGE CREATE =================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ===== OWNER MANUAL ORDER =====
  if (message.content.startsWith("!order")) {

    if (!message.member.roles.cache.some(r => r.name === OWNER_ROLE_NAME)) {
      return message.reply("❌ انت مش معاك صلاحية.");
    }

    const args = message.content.slice(7).split("|");
    if (args.length < 2)
      return message.reply("❌ استخدم:\n!order اسم المنتج | السعر");

    const service = args[0].trim();
    const price = parseInt(args[1].replace("$","").trim());
    if (isNaN(price)) return message.reply("❌ السعر لازم رقم.");

    createOrderEmbed(message.channel, service, price, message.author.id);
  }

  // ===== STORE MESSAGE (OWNER ONLY) =====
  if (message.content === "!store") {

    if (!message.member.roles.cache.some(r => r.name === OWNER_ROLE_NAME)) {
      return message.reply("❌ انت مش معاك صلاحية.");
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_buy")
        .setLabel("🛒 Buy")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({
      content: "## BOOSTFIY STORE 👑\nاضغط Buy لاختيار لعبتك",
      components: [row]
    });
  }
});

// ================= INTERACTIONS =================

client.on('interactionCreate', async (interaction) => {

  // ===== SELECT MENUS =====
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "select_game") {

      const game = interaction.values[0];
      const items = STORE_ITEMS[game];

      const itemMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_item")
          .setPlaceholder("🛍 اختر الايتم")
          .addOptions(
            items.map(i => ({
              label: i.label,
              value: `${i.service}|${i.price}`
            }))
          )
      );

      return interaction.update({
        content: "اختار الايتم:",
        components: [itemMenu]
      });
    }

    if (interaction.customId === "select_item") {

      const [service, price] = interaction.values[0].split("|");

      orderCounter++;

      orders[orderCounter] = {
        collected: false,
        delivered: false,
        seller: null,
        service,
        price: parseInt(price),
        userId: interaction.user.id
      };

      const category = interaction.guild.channels.cache.find(
        c => c.name === TICKET_CATEGORY_NAME
      );

      if (!category)
        return interaction.reply({
          content: "❌ اعمل كاتيجوري باسم 𝐓𝐢𝐜𝐤𝐞𝐭𝐬",
          ephemeral: true
        });

      const ticket = await interaction.guild.channels.create({
        name: `ticket-${orderCounter}`,
        parent: category.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

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

      const msg = await ticket.send({
        content: `<@&${GAMERS_ROLE_ID}>`,
        embeds: [embed],
        components: [row]
      });

      orders[orderCounter].messageId = msg.id;

      return interaction.reply({
        content: `✅ تم فتح تيكت طلبك: ${ticket}`,
        ephemeral: true
      });
    }
  }

  // ===== BUTTONS =====
  if (!interaction.isButton()) return;

  if (interaction.customId === "start_buy") {

    const gameMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_game")
        .setPlaceholder("🎮 اختر اللعبة")
        .addOptions([
          { label: "Fortnite", value: "fortnite" },
          { label: "Valorant", value: "valorant" }
        ])
    );

    return interaction.reply({
      content: "اختار اللعبة:",
      components: [gameMenu],
      ephemeral: true
    });
  }

  const [action, orderId] = interaction.customId.split("_");
  const order = orders[orderId];
  if (!order)
    return interaction.reply({ content: "❌ الأوردر مش موجود.", ephemeral: true });

  // ===== COLLECT =====
  if (action === "collect") {

    if (order.collected)
      return interaction.reply({ content: "⚠️ متجمع بالفعل.", ephemeral: true });

    await interaction.deferUpdate();

    order.collected = true;
    order.seller = interaction.user.id;

    const originalMessage = await interaction.channel.messages.fetch(order.messageId);

    const updatedEmbed = new EmbedBuilder(originalMessage.embeds[0])
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 **Item:** ${order.service}
💰 **Price:** $${order.price}

🔹 **Order:** #${orderId}
🔹 **Seller:** <@${interaction.user.id}>
🔹 **Status:** Collected

━━━━━━━━━━━━━━━━━━`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`delivered_${orderId}`)
        .setLabel("Delivered")
        .setStyle(ButtonStyle.Primary)
    );

    await originalMessage.edit({ embeds: [updatedEmbed], components: [row] });
  }

  // ===== DELIVERED =====
  if (action === "delivered") {

    if (order.delivered)
      return interaction.reply({ content: "⚠️ متسلم بالفعل.", ephemeral: true });

    await interaction.deferUpdate();
    order.delivered = true;

    await pool.query(
      `INSERT INTO orders (order_number, user_id, seller_id, service, price, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [orderId, order.userId, order.seller, order.service, order.price, "Delivered"]
    );

    const originalMessage = await interaction.channel.messages.fetch(order.messageId);

    const updatedEmbed = new EmbedBuilder(originalMessage.embeds[0])
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 **Item:** ${order.service}
💰 **Price:** $${order.price}

🔹 **Order:** #${orderId}
🔹 **Seller:** <@${order.seller}>
🔹 **Status:** Delivered ✅

━━━━━━━━━━━━━━━━━━`
      );

    await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
  }
});

client.login(process.env.TOKEN);
