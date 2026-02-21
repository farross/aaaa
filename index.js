const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  ChannelType,
  PermissionsBitField
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
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";
const LOG_CHANNEL_NAME = "order-logs";

const BANNER_URL = "https://cdn.discordapp.com/attachments/963969901729546270/1474623270740561930/Yellow_Neon_Gaming_YouTube_Banner.png";

let orderCounter = 3000;
let orders = {};

client.once('clientReady', () => {
  console.log(`${STORE_NAME} FULL SYSTEM Ready 👑`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!order")) {

    const details = message.content.slice(7).trim();
    if (!details) return message.reply("اكتب تفاصيل الأوردر بعد !order");

    orderCounter++;

    orders[orderCounter] = {
      collected: false,
      seller: null,
      details: details,
      ticketId: null
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

🟢 **Status:** Available

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

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const [action, id] = interaction.customId.split("_");
  if (!orders[id]) return;

  const order = orders[id];

  // ================= Collect =================
  if (action === "collect") {

    if (order.collected)
      return interaction.reply({ content: "❌ تم جمع الأوردر بالفعل.", ephemeral: true });

    order.collected = true;
    order.seller = interaction.user;

    const category = interaction.guild.channels.cache.find(
      c => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory
    );

    const staffRole = interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE_NAME);

    const ticketChannel = await interaction.guild.channels.create({
      name: `order-${id}`,
      type: ChannelType.GuildText,
      parent: category?.id,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: staffRole?.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ],
    });

    order.ticketId = ticketChannel.id;

    const closeRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${id}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`delivered_${id}`)
          .setLabel("Delivered")
          .setStyle(ButtonStyle.Success)
      );

    await ticketChannel.send({
      content: `🎟️ Order #${id}\nSeller: ${interaction.user}\n\n${order.details}`,
      components: [closeRow]
    });

    // Log
    const logChannel = interaction.guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
    if (logChannel) {
      logChannel.send(`📥 Order #${id} collected by ${interaction.user}`);
    }

    // Update order message
    const embed = new EmbedBuilder()
      .setColor("#ff4444")
      .setImage(BANNER_URL)
      .setDescription(
`📢 **New Order** <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━

🔸 **Details:** ${order.details}

🔹 **Order:** #${id}
🔹 **Seller:** ${interaction.user}

🔴 **Status:** Collected

━━━━━━━━━━━━━━━━━━`
      );

    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("collected")
          .setLabel("Collected")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

    await interaction.update({ embeds: [embed], components: [disabledRow] });
  }

  // ================= Close Ticket =================
  if (action === "close") {

    const staffRole = interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE_NAME);

    if (!interaction.member.roles.cache.has(staffRole?.id))
      return interaction.reply({ content: "❌ للستاف فقط.", ephemeral: true });

    await interaction.reply("🔒 سيتم إغلاق التيكت بعد 3 ثواني...");
    setTimeout(() => interaction.channel.delete(), 3000);
  }

  // ================= Delivered =================
  if (action === "delivered") {

    const staffRole = interaction.guild.roles.cache.find(r => r.name === STAFF_ROLE_NAME);

    if (!interaction.member.roles.cache.has(staffRole?.id))
      return interaction.reply({ content: "❌ للستاف فقط.", ephemeral: true });

    const logChannel = interaction.guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
    if (logChannel) {
      logChannel.send(`✅ Order #${id} delivered.`);
    }

    await interaction.reply("✅ تم تعليم الأوردر كمُسلّم.");
  }
});

client.login(process.env.TOKEN);
