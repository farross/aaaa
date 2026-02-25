// ======================================================
// Advanced Order System - Stable Embed Version
// ======================================================

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  EmbedBuilder
} = require('discord.js');

const fs = require('fs');

// ======================= CONFIG =======================
const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474625885062697161";
const COMMUNITY_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_ID = "1474602945579450458";
const CLOSED_CATEGORY_ID = "1474602945579450459";
const ORDER_ROLE_ID = "1474602944602177730";
const MANAGER_ROLE_ID = "1474602944602177730";

const BANNER_URL = "https://cdn.discordapp.com/attachments/908838301832720394/1475559359164715292/1.png";

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

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setDescription(
`## 📢 NEW ORDER <@&${GAMERS_ROLE_ID}>

### 📦 Order Details
\`\`\`
${data.service}
\`\`\`

💰 **Price:** ${data.price}
🆔 **Order ID:** #${id}
👤 **Seller:** <@${data.customer}>`
    )
    .setImage(BANNER_URL); // البانر تحت

  if (data.image) {
    embed.setThumbnail(data.image.split("?")[0]); // الصورة يمين
  }

  return embed;
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
      return message.reply("❌ ليس لديك صلاحية لاستخدام هذا الأمر.");

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

    // ================= OPEN MODAL =================
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
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("image")
            .setLabel("رابط صورة (اختياري)")
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ================= CREATE ORDER =================
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {

      orderData.count++;
      const id = orderData.count;

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");
      const image = interaction.fields.getTextInputValue("image") || null;

      orderData.orders[id] = {
        service,
        price,
        image,
        status: "pending",
        customer: interaction.user.id
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

      const orderMessage = await channel.send({
        embeds: [buildOrderEmbed(id, orderData.orders[id])],
        components: [row]
      });

      orderData.orders[id].messageId = orderMessage.id;
      saveOrders();

      return interaction.reply({ content: "✅ Order Sent!", ephemeral: true });
    }

    // ================= ACCEPT =================
    if (interaction.isButton() && interaction.customId.startsWith("accept_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];
      if (!data) return interaction.reply({ content: "❌ Order not found.", ephemeral: true });

      data.status = "accepted";
      saveOrders();

      const ticket = await interaction.guild.channels.create({
        name: `order-${id}`,
        type: 0,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
          { id: data.customer, allow: ['ViewChannel', 'SendMessages'] },
          { id: COMMUNITY_ROLE_ID, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });

      await ticket.send({
        embeds: [buildOrderEmbed(id, data)]
      });

      return interaction.reply({
        content: `✅ Ticket created: ${ticket}`,
        ephemeral: true
      });
    }

    // ================= CLOSE =================
    if (interaction.isButton() && interaction.customId.startsWith("close_")) {

      await interaction.channel.setParent(CLOSED_CATEGORY_ID);

      return interaction.reply({
        content: "🔒 Ticket moved to Closed.",
        ephemeral: true
      });
    }

  });

};
