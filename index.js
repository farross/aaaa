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

const OWNER_ROLE_NAME = "ᴼᵂᴺᴱᴿ";
const GAMERS_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_NAME = "𝐓𝐢𝐜𝐤𝐞𝐭𝐬";
const CLOSED_CATEGORY_NAME = "𝐂𝐋𝐎𝐒𝐄𝐃";

let orderCounter = 3000;
let orders = {};

client.once('ready', () => {
  console.log("BOOSTFIY Ready 👑");
});

// ================= MESSAGE =================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ===== !order =====
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
      client: message.author.id
    };

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle(`📦 Order #${orderCounter}`)
      .setDescription(`
Item: **${service}**
Price: **${price}**
Code: **${code}**
Status: Pending
`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collect_${orderCounter}`)
        .setLabel("Collect")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }

  // ===== !store =====
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

// ================= INTERACTIONS =================

client.on('interactionCreate', async (interaction) => {

  // ===== BUY BUTTON =====
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

  // ===== GAME SELECT =====
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "select_game") {

      if (interaction.values[0] === "ark") {

        const arkMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("select_ark")
            .setPlaceholder("Choose ARK Category")
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

  // ===== ORDER COLLECT =====
  if (interaction.isButton() && interaction.customId.startsWith("collect_")) {

    const id = interaction.customId.split("_")[1];
    const data = orders[id];
    if (!data) return;

    const category = interaction.guild.channels.cache.find(
      c => c.name === TICKET_CATEGORY_NAME
    );

    const ticket = await interaction.guild.channels.create({
      name: `ticket-${id}`,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: data.client, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${id}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await ticket.send({
      content: `
🎟️ Order #${id}

👤 Client: <@${data.client}>
🛒 Seller: <@${interaction.user.id}>

Item: ${data.service}
Price: ${data.price}
Code: ${data.code}
`,
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


// ================= SHOP TICKET FUNCTION =================

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

  await ticket.send(`
🛍️ Shop Order

👤 Client: <@${interaction.user.id}>
Item: ${service}
Price: ${price}
`);

  await interaction.reply({ content: `✅ Ticket Created: ${ticket}`, ephemeral: true });
}

client.login(process.env.TOKEN);
