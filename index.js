require('./db');

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const STORE_NAME = "BOOSTFIY";
const OWNER_ROLE_NAME = "ᴼᵂᴺᴱᴿ"; // 👈 الرول اللي تقدر تعمل اوردر
const GAMERS_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";
const CLOSED_CATEGORY_NAME = "𝐂𝐋𝐎𝐒𝐄𝐃";

const BANNER_URL = "https://cdn.discordapp.com/attachments/963969901729546270/1474623270740561930/Yellow_Neon_Gaming_YouTube_Banner.png";

let orderCounter = 3000;
let orders = {};

client.once('ready', () => {
  console.log(`${STORE_NAME} Ready 👑`);
});


// ================= ORDER =================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!order")) {

    // 🔥 السماح لرول OWNER فقط
    if (!message.member.roles.cache.some(r => r.name === OWNER_ROLE_NAME)) {
      return message.reply("❌ انت مش معاك صلاحية استخدام الأمر ده.");
    }

    const details = message.content.slice(7).trim();
    if (!details) return message.reply("اكتب تفاصيل الأوردر بعد !order");

    orderCounter++;

    orders[orderCounter] = {
      collected: false,
      delivered: false,
      seller: null,
      details: details,
      userId: message.author.id
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
});


// ================= BUTTONS =================

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isButton()) return;

  const [action, orderId] = interaction.customId.split("_");
  const order = orders[orderId];
  if (!order) return interaction.reply({ content: "❌ الأوردر مش موجود.", ephemeral: true });

  // ===== COLLECT =====
  if (action === "collect") {

    if (order.collected) {
      return interaction.reply({ content: "⚠️ الأوردر متجمع بالفعل.", ephemeral: true });
    }

    await interaction.deferUpdate();

    order.collected = true;
    order.seller = interaction.user.id;

    const originalMessage = await interaction.channel.messages.fetch(order.messageId);

    const updatedEmbed = new EmbedBuilder(originalMessage.embeds[0])
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 ~~${order.details}~~

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

    const category = interaction.guild.channels.cache.find(c => c.name === TICKET_CATEGORY_NAME);

    const channel = await interaction.guild.channels.create({
      name: `ticket-${orderId}`,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: order.userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const ticketEmbed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle(`🎟️ Order #${orderId}`)
      .setDescription(`
🔸 **Details:** ${order.details}

👤 **Client:** <@${order.userId}>
🛒 **Seller:** <@${interaction.user.id}>
`);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${orderId}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [ticketEmbed], components: [closeRow] });
  }


  // ===== DELIVERED =====
  if (action === "delivered") {

    if (order.delivered) {
      return interaction.reply({ content: "⚠️ الأوردر متعلم Delivered بالفعل.", ephemeral: true });
    }

    await interaction.deferUpdate();

    order.delivered = true;

    const originalMessage = await interaction.channel.messages.fetch(order.messageId);

    const updatedEmbed = new EmbedBuilder(originalMessage.embeds[0])
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 ~~${order.details}~~

🔹 **Order:** #${orderId}
🔹 **Seller:** <@${order.seller}>
🔹 **Status:** Delivered ✅

━━━━━━━━━━━━━━━━━━`
      );

    // ❌ إزالة كل الأزرار نهائيًا
    await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
  }


  // ===== CLOSE =====
  if (action === "close") {

    await interaction.deferReply({ ephemeral: true });

    const closedCategory = interaction.guild.channels.cache.find(c => c.name === CLOSED_CATEGORY_NAME);

    if (!closedCategory) {
      return interaction.editReply("❌ اعمل كاتيجوري باسم 𝐂𝐋𝐎𝐒𝐄𝐃");
    }

    await interaction.channel.setParent(closedCategory.id);
    await interaction.channel.setName(`closed-${orderId}`);

    await interaction.editReply("✅ تم نقل التيكت إلى CLOSED");
  }

});

client.login(process.env.TOKEN);
