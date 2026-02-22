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

    orderCounter++;

    orders[orderCounter] = {
      service,
      price,
      code,
      client: message.author.id,
      seller: null,
      messageId: null
    };

    // 👇 يخلي الاوردر ينزل في روم معينة
    const ordersChannel = message.guild.channels.cache.find(
      c => c.name === "〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦"
    );

    if (!ordersChannel) return message.reply("❌ اعمل روم باسم 〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦");

    // 🎯 الإيمبد زي الصورة بالضبط
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("📢 NEW ORDER")
      .setDescription(
`📢 **NEW ORDER** <@&${GAMERS_ROLE_ID}>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔸 Details: **${service}**

💠 Order: **${orderCounter}**
👤 Seller: **None**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setImage("https://cdn.discordapp.com/attachments/908838301832720394/1475038586507231344/Black_Geometric_Minimalist_Gaming_Logo.gif?ex=699c083b&is=699ab6bb&hm=59869632ac623640c1f3ef798eba23f9589fa52faa48a035f213b937749e574b&");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collect_${orderCounter}`)
        .setLabel("Collect")
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

// ======================= INTERACTIONS =======================

client.on('interactionCreate', async (interaction) => {

  // ===== BUY =====
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

  // ===== SELECT MENU =====
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

  // ===== COLLECT =====
  if (interaction.isButton() && interaction.customId.startsWith("collect_")) {

    const id = interaction.customId.split("_")[1];
    const data = orders[id];
    if (!data) return;

    data.seller = interaction.user.id;

    const originalMsg = await interaction.channel.messages.fetch(data.messageId);

    const updatedEmbed = new EmbedBuilder(originalMsg.embeds[0])
      .setDescription(
`📢 **NEW ORDER** <@&${GAMERS_ROLE_ID}>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔸 Details: **${data.service}**

💠 Order: **${id}**
👤 Seller: **<@${data.seller}>**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );

    const newRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`delivered_${id}`)
        .setLabel("Delivered")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`manage_${id}`)
        .setLabel("Manage")
        .setStyle(ButtonStyle.Secondary)
    );

    await originalMsg.edit({ embeds: [updatedEmbed], components: [newRow] });

    const category = interaction.guild.channels.cache.find(
      c => c.name === TICKET_CATEGORY_NAME
    );

    const ticket = await interaction.guild.channels.create({
      name: `ticket-${id}`,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: data.client, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: data.seller, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${id}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await ticket.send({
      content:
`🎟️ Order #${id}

👤 Client: <@${data.client}>
🛒 Seller: <@${data.seller}>

📦 ${data.service}
💰 ${data.price}
🔑 ${data.code}`,
      components: [closeRow]
    });

    await interaction.reply({ content: `✅ Ticket Created: ${ticket}`, ephemeral: true });
  }

  // ===== CLOSE =====
  if (interaction.isButton() && interaction.customId.startsWith("close_")) {

    const closedCategory = interaction.guild.channels.cache.find(
      c => c.name === CLOSED_CATEGORY_NAME
    );

    await interaction.channel.setParent(closedCategory.id);
    await interaction.channel.setName(`closed-${interaction.channel.name}`);

    await interaction.reply({ content: "✅ Ticket Closed", ephemeral: true });
  }
});

async function createShopTicket(interaction, service, price) {

  orderCounter++;

  const category = interaction.guild.channels.cache.find(
    c => c.name === TICKET_CATEGORY_NAME
  );

  const ticket = await interaction.guild.channels.create({
    name: `ticket-${orderCounter}`,
    parent: category.id,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
    ]
  });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`close_${orderCounter}`)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  await ticket.send({
    content:
`🛍️ Shop Order

👤 Client: <@${interaction.user.id}>
📦 ${service}
💰 ${price}`,
    components: [closeRow]
  });

  await interaction.reply({ content: `✅ Ticket Created: ${ticket}`, ephemeral: true });
}

client.login(process.env.TOKEN);
