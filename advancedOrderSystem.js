// ======================================================
// Advanced Order System - Gold Style Version
// ======================================================

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');

// ======================= CONFIG =======================

const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_ID = "1474602945579450458";
const CLOSED_CATEGORY_ID = "1474602945579450459";
const ORDER_ROLE_ID = "1474602944602177730";
const MANAGER_ROLE_ID = "1474602944602177730";

const LOGO_URL = "https://cdn.discordapp.com/attachments/1474602944983990290/1476049474051899462/Vita-Spray-Blueprint.png";
const BANNER_URL = "https://cdn.discordapp.com/attachments/1474602944983990290/1476075693208240230/New_Boostfiy_order_announcement.png";

// ======================= STORAGE =======================

let orderData = { count: 0, orders: {} };

if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

// ======================= EMBED BUILDER =======================

function buildOrderEmbed(id, data) {
  return new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`📦 New Order | <@${data.customer}>`)
    .addFields(
      {
        name: "📦 Order Details",
        value: `\`\`\`\n${data.service}\n\`\`\``
      },
      {
        name: "🆔 Order ID",
        value: `#${id}`,
        inline: true
      },
      {
        name: "💰 Price",
        value: data.price,
        inline: true
      },
      {
        name: "👤 Assigned Seller",
        value: data.assigned ? `<@${data.assigned}>` : "Not Assigned",
        inline: false
      }
    )
    .setThumbnail(LOGO_URL)
    .setImage(BANNER_URL)
    .setFooter({ text: "Boostfiy Order System" })
    .setTimestamp();
}

// ======================================================
// MODULE EXPORT
// ======================================================

module.exports = (client) => {

  // ================= SETUP BUTTON =================

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.content !== "!setup-order") return;

    if (!message.member.roles.cache.has(ORDER_ROLE_ID))
      return message.reply("❌ ليس لديك صلاحية.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_order")
        .setLabel("🚀 Start Order")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: "اضغط لبدء طلب جديد 👇",
      components: [row]
    });
  });

  // ================= INTERACTIONS =================

  client.on(Events.InteractionCreate, async (interaction) => {

    // ===== OPEN MODAL =====

    if (interaction.isButton() && interaction.customId === "start_order") {

      const modal = new ModalBuilder()
        .setCustomId("order_modal")
        .setTitle("Create Order");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("service")
            .setLabel("تفاصيل الطلب")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("price")
            .setLabel("السعر")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== CREATE ORDER =====

    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {

      orderData.count++;
      const id = orderData.count;

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");

      orderData.orders[id] = {
        service,
        price,
        status: "pending",
        customer: interaction.user.id,
        assigned: null
      };

      saveOrders();

      const channel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${id}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`manage_${id}`)
          .setLabel("Manage")
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await channel.send({
        embeds: [buildOrderEmbed(id, orderData.orders[id])],
        components: [row]
      });

      orderData.orders[id].messageId = msg.id;
      saveOrders();

      return interaction.reply({ content: "✅ Order Sent!", ephemeral: true });
    }

    // ===== ACCEPT =====

    if (interaction.isButton() && interaction.customId.startsWith("accept_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data)
        return interaction.reply({ content: "❌ Order not found.", ephemeral: true });

      if (data.status === "accepted")
        return interaction.reply({ content: "❌ Already accepted.", ephemeral: true });

      data.status = "accepted";
      data.assigned = interaction.user.id;
      saveOrders();

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${id}`)
          .setLabel("Accepted ✅")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`manage_${id}`)
          .setLabel("Manage")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.message.edit({
        embeds: [buildOrderEmbed(id, data)],
        components: [disabledRow]
      });

      const ticket = await interaction.guild.channels.create({
        name: `order-${id}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: data.customer,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          },
          {
            id: data.assigned,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          }
        ]
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${id}`)
          .setLabel("🔒 Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await ticket.send({
        embeds: [buildOrderEmbed(id, data)],
        components: [closeRow]
      });

      return interaction.reply({
        content: `✅ Ticket created: ${ticket}`,
        ephemeral: true
      });
    }

    // ===== CLOSE =====

    if (interaction.isButton() && interaction.customId.startsWith("close_")) {

      await interaction.channel.setParent(CLOSED_CATEGORY_ID);

      return interaction.reply({
        content: "🔒 Ticket moved to Closed.",
        ephemeral: true
      });
    }

  });

};
