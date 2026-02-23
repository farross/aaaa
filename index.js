require('./db');

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

const BANNER = "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg";

let orderCounter = 3600;
let orders = {};

client.once('ready', () => {
  console.log("🖤 BOOSTFIY Ready");
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

    const ordersChannel = message.guild.channels.cache.find(
      c => c.name === "〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦"
    );

    if (!ordersChannel)
      return message.reply("❌ اعمل روم باسم 〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦");

    const embed = new EmbedBuilder()
      .setColor("#1a1b1f")
      .setImage(BANNER)
      .setDescription(
`## 🖤 BOOSTFIY STORE <@&${GAMERS_ROLE_ID}>

━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 **Order Details**
\`\`\`
${service}
\`\`\`

💰 **Price:** ${price}  
🔑 **Code:** ${code}

🆔 **Order ID:** #${orderCounter}  
👤 **Seller:** None  

━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: "© BOOSTFIY" });

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
});

// ======================= INTERACTIONS =======================

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isButton()) return;

  const [action, id] = interaction.customId.split("_");
  const data = orders[id];
  if (!data) return;

  // ===== COLLECT =====
  if (action === "collect") {

    if (data.seller)
      return interaction.reply({ content: "⚠️ Already Collected", ephemeral: true });

    data.seller = interaction.user.id;

    const originalMsg = await interaction.channel.messages.fetch(data.messageId);

    const updatedEmbed = new EmbedBuilder()
      .setColor("#1a1b1f")
      .setImage(BANNER)
      .setDescription(
`## ⚡ ORDER ACTIVE

━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 **Order Details**
\`\`\`
${data.service}
\`\`\`

💰 **Price:** ${data.price}  
🔑 **Code:** ${data.code}

🆔 **Order ID:** #${id}  
👤 **Seller:** <@${data.seller}>

━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: "BOOSTFIY • Active Order" });

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

    // ===== CREATE TICKET =====
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

  // ===== DELIVERED =====
  if (action === "delivered") {

    const originalMsg = await interaction.channel.messages.fetch(data.messageId);

    const doneEmbed = new EmbedBuilder()
      .setColor("#00cc66")
      .setImage(BANNER)
      .setDescription(
`## ✅ ORDER COMPLETED

━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 **Order ID:** #${id}  
👤 **Seller:** <@${data.seller}>

━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: "BOOSTFIY • Completed" });

    await originalMsg.edit({ embeds: [doneEmbed], components: [] });

    await interaction.reply({ content: "✅ Marked as Delivered", ephemeral: true });
  }

  // ===== CLOSE =====
  if (action === "close") {

    const closedCategory = interaction.guild.channels.cache.find(
      c => c.name === CLOSED_CATEGORY_NAME
    );

    await interaction.channel.setParent(closedCategory.id);
    await interaction.channel.setName(`closed-${interaction.channel.name}`);

    await interaction.reply({ content: "✅ Ticket Closed", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
