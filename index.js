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
const STAFF_ROLE_NAME = "Staff";
const GAMERS_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";

const BANNER_URL = "https://cdn.discordapp.com/attachments/963969901729546270/1474623270740561930/Yellow_Neon_Gaming_YouTube_Banner.png";

let orderCounter = 3000;
let orders = {};

client.once('ready', () => {
  console.log(`${STORE_NAME} Ready 👑`);
});


// =================== ORDER COMMAND ===================

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


// =================== BUTTON SYSTEM ===================

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isButton()) return;

  const [action, orderId] = interaction.customId.split("_");

  if (!orders[orderId]) {
    return interaction.reply({ content: "❌ الأوردر غير موجود.", ephemeral: true });
  }

  // ===== COLLECT =====
  if (action === "collect") {

    await interaction.deferReply({ ephemeral: true });

    if (orders[orderId].collected) {
      return interaction.editReply("⚠️ الأوردر متجمع بالفعل.");
    }

    orders[orderId].collected = true;
    orders[orderId].seller = interaction.user.id;

    const category = interaction.guild.channels.cache.find(
      c => c.name === TICKET_CATEGORY_NAME
    );

    if (!category) {
      return interaction.editReply("❌ كاتيجوري 𝐓𝐢𝐜𝐤𝐞𝐭𝐬 مش موجودة.");
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${orderId}`,
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: orders[orderId].userId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        }
      ]
    });

    const ticketEmbed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle(`🎟️ Order #${orderId}`)
      .setDescription(`
🔸 **Details:** ${orders[orderId].details}

👤 **Client:** <@${orders[orderId].userId}>
🛒 **Seller:** <@${interaction.user.id}>
`)
      .setFooter({ text: `${STORE_NAME} • Ticket System` });

    const closeRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${orderId}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({ embeds: [ticketEmbed], components: [closeRow] });

    await interaction.editReply(`✅ تم فتح تيكت: ${channel}`);
  }

  // ===== CLOSE =====
  if (action === "close") {

    await interaction.deferReply({ ephemeral: true });

    await interaction.channel.delete().catch(() => {});

  }

});

client.login(process.env.TOKEN);
