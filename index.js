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

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("📢 𝐍𝐄𝐖 𝐎𝐑𝐃𝐄𝐑")
      .setDescription(
`🔸 **𝐃𝐄𝐓𝐀𝐈𝐋𝐒:** ${service}
💰 **𝐏𝐑𝐈𝐂𝐄:** ${price}
🔑 **𝐂𝐎𝐃𝐄:** ${code}

🔹 **𝐎𝐑𝐃𝐄𝐑:** #${orderCounter}
🔹 **𝐒𝐄𝐋𝐋𝐄𝐑:** None`
      )
      .setImage("https://cdn.discordapp.com/attachments/976992409219133530/1474879330147635350/1.png");

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

    const msg = await message.channel.send({
      content: `<@&${GAMERS_ROLE_ID}>`,
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

// باقي الكود زي ما هو بدون أي تغيير 👇👇👇

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

  await interaction.deferUpdate(); // 🔥 مهم جداً

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

    return interaction.editReply({
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

  if (interaction.isButton() && interaction.customId.startsWith("collect_")) {

    const id = interaction.customId.split("_")[1];
    const data = orders[id];
    if (!data) return;

    data.seller = interaction.user.id;

    const originalMsg = await interaction.channel.messages.fetch(data.messageId);

    const updatedEmbed = new EmbedBuilder(originalMsg.embeds[0])
      .setDescription(
`🔸 ~~${data.service}~~
💰 ~~${data.price}~~
🔑 ~~${data.code}~~

🔹 **𝐎𝐑𝐃𝐄𝐑:** #${id}
🔹 **𝐒𝐄𝐋𝐋𝐄𝐑:** <@${data.seller}>`
      );

    await originalMsg.edit({ embeds: [updatedEmbed] });

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
`🎟️ 𝐎𝐑𝐃𝐄𝐑 #${id}

👤 𝐂𝐋𝐈𝐄𝐍𝐓: <@${data.client}>
🛒 𝐒𝐄𝐋𝐋𝐄𝐑: <@${data.seller}>

📦 ${data.service}
💰 ${data.price}
🔑 ${data.code}`,
      components: [closeRow]
    });

    await interaction.reply({ content: `✅ Ticket Created: ${ticket}`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId.startsWith("close_")) {

    const closedCategory = interaction.guild.channels.cache.find(
      c => c.name === CLOSED_CATEGORY_NAME
    );

    await interaction.channel.setParent(closedCategory.id);
    await interaction.channel.setName(`closed-${interaction.channel.name}`);

    await interaction.reply({ content: "✅ Ticket Closed", ephemeral: true });
  }
});

client.login(process.env.TOKEN);

