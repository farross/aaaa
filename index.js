const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
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

const TICKET_CATEGORY = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";
const CLOSED_CATEGORY = "𝐂𝐋𝐎𝐒𝐄𝐃";

let orderCounter = 1000;
let orders = {};

client.once('ready', () => {
  console.log("BOOSTFIY SYSTEM READY 👑");
});


// ======================= ORDER SYSTEM =======================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ===== !order =====
  if (message.content.startsWith("!order")) {

    const args = message.content.slice(7).split("|");
    if (args.length < 3)
      return message.reply("استخدم:\n!order name | price$ | code");

    const product = args[0].trim();
    const price = args[1].trim();
    const code = args[2].trim();

    orderCounter++;

    orders[orderCounter] = {
      product,
      price,
      code,
      client: message.author.id
    };

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle(`🛒 Order #${orderCounter}`)
      .setDescription(`
📦 Product: **${product}**
💰 Price: **${price}**
🔑 Code: **${code}**
`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collect_${orderCounter}`)
        .setLabel("Collect")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }


  // ===== !shop =====
  if (message.content === "!shop") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_menu")
        .setLabel("Buy")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: "🛍️ Welcome To BOOSTFIY Shop",
      components: [row]
    });
  }
});


// ======================= INTERACTIONS =======================

client.on('interactionCreate', async (interaction) => {

  // ===== ORDER COLLECT =====
  if (interaction.isButton() && interaction.customId.startsWith("collect_")) {

    const orderId = interaction.customId.split("_")[1];
    const data = orders[orderId];
    if (!data) return;

    const category = interaction.guild.channels.cache.find(
      c => c.name === TICKET_CATEGORY
    );

    const ticket = await interaction.guild.channels.create({
      name: `ticket-${orderId}`,
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: data.client,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${orderId}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await ticket.send({
      content: `
🎟️ Order #${orderId}

👤 Client: <@${data.client}>
🛒 Seller: <@${interaction.user.id}>

📦 Product: ${data.product}
💰 Price: ${data.price}
🔑 Code: ${data.code}
`,
      components: [closeRow]
    });

    await interaction.reply({ content: `✅ Ticket Created: ${ticket}`, ephemeral: true });
  }


  // ===== CLOSE TICKET =====
  if (interaction.isButton() && interaction.customId.startsWith("close_")) {

    const closedCategory = interaction.guild.channels.cache.find(
      c => c.name === CLOSED_CATEGORY
    );

    await interaction.channel.setParent(closedCategory.id);
    await interaction.channel.setName(`closed-${interaction.channel.name}`);

    await interaction.reply({ content: "✅ Ticket Closed", ephemeral: true });
  }


  // ===== SHOP BUY BUTTON =====
  if (interaction.isButton() && interaction.customId === "buy_menu") {

    const select = new StringSelectMenuBuilder()
      .setCustomId("game_select")
      .setPlaceholder("Choose Game")
      .addOptions([
        { label: "Ark Raiders", value: "ark" },
        { label: "World of Warcraft", value: "wow" }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({ content: "Select Game:", components: [row], ephemeral: true });
  }


  // ===== GAME SELECT =====
  if (interaction.isStringSelectMenu() && interaction.customId === "game_select") {

    if (interaction.values[0] === "ark") {

      const select = new StringSelectMenuBuilder()
        .setCustomId("ark_type")
        .setPlaceholder("Choose Type")
        .addOptions([
          { label: "Items", value: "items" },
          { label: "Weapons", value: "weapons" }
        ]);

      const row = new ActionRowBuilder().addComponents(select);

      return interaction.update({ content: "Select Category:", components: [row] });
    }

    if (interaction.values[0] === "wow") {
      return createShopTicket(interaction, "World of Warcraft");
    }
  }


  // ===== ARK CATEGORY =====
  if (interaction.isStringSelectMenu() && interaction.customId === "ark_type") {

    const type = interaction.values[0];
    createShopTicket(interaction, `Ark Raiders - ${type}`);
  }

});


// ======================= CREATE SHOP TICKET =======================

async function createShopTicket(interaction, productName) {

  const category = interaction.guild.channels.cache.find(
    c => c.name === TICKET_CATEGORY
  );

  const ticket = await interaction.guild.channels.create({
    name: `shop-${interaction.user.username}`,
    parent: category.id,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      }
    ]
  });

  await ticket.send(`
🛍️ Shop Order

👤 Client: <@${interaction.user.id}>
🎮 Selected: ${productName}
`);

  await interaction.reply({ content: `✅ Ticket Created: ${ticket}`, ephemeral: true });
}

client.login(process.env.TOKEN);
