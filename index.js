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
const STAFF_ROLE_NAME = "Staff";
const GAMERS_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";

const BANNER_URL = "https://cdn.discordapp.com/attachments/963969901729546270/1474623270740561930/Yellow_Neon_Gaming_YouTube_Banner.png";

let orderCounter = 3000;
let orders = {};

client.once('ready', () => {
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

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isButton()) return;

  const [action, orderId] = interaction.customId.split("_");

  if (!orders[orderId]) {
    return interaction.reply({ content: "❌ الأوردر غير موجود.", ephemeral: true });
  }

  if (action === "collect") {

    await interaction.deferReply({ ephemeral: true });

    if (orders[orderId].collected) {
      return interaction.editReply("⚠️ الأوردر متجمع بالفعل.");
    }

    orders[orderId].collected = true;
    orders[orderId].seller = interaction.user.id;

    // تسجيل في الداتا بيز (مؤقت السعر 0)
    try {
      await pool.query(
        `INSERT INTO orders (user_id, service, price, cost, profit, status)
         VALUES ($1,$2,$3,$4,$5,'collected')`,
        [
          orders[orderId].userId,
          orders[orderId].details,
          0,
          0,
          0
        ]
      );
    } catch (err) {
      console.error("DB Error:", err);
    }

    const category = interaction.guild.channels.cache.find(
      c => c.name === TICKET_CATEGORY_NAME && c.type === 4
    );

    if (!category) {
      return interaction.editReply("❌ كاتيجوري 𝐓𝐢𝐜𝐤𝐞𝐭𝐬 مش موجودة.");
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${orderId}`,
      type: 0,
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

    await channel.send(`🎟️ Ticket for Order #${orderId}
👤 Client: <@${orders[orderId].userId}>
🛒 Seller: <@${interaction.user.id}>`);

    await interaction.editReply(`✅ تم فتح تيكت: ${channel}`);
  }

});

client.login(process.env.TOKEN);
