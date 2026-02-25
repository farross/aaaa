// ======================================================
// Advanced Order System - Clean Final Version
// ======================================================

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  ContainerBuilder,
  SeparatorSpacingSize,
  MediaGalleryItemBuilder,
  MessageFlags
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

const BANNER_URL = "https://cdn.discordapp.com/attachments/908838301832720394/1475559359164715292/1.png?ex=699ded3d&is=699c9bbd&hm=211058c1ece58853229d43896b2908cdf66710b1142babc7228564cf5682e65c&";

// ======================= STORAGE =======================
let orderData = { count: 0, orders: {} };

if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

// ======================= BUILD ORDER UI =======================
// ======================= BUILD ORDER UI =======================
function buildOrderContainer(id, data) {

  const container = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addMediaGalleryComponents(media =>
      media.addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_URL)
      )
    )
    .addSeparatorComponents(sep =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(text =>
      text.setContent(
`## 📢 NEW ORDER <@&${GAMERS_ROLE_ID}>

### 📦 Order Details
\`\`\`
${data.service}
\`\`\``
      )
    );

  // 👇 الصورة الصغيرة فوق يمين
  if (data.image && data.image.startsWith("http")) {
    container.setThumbnail({ url: data.image });
  }

  container
    .addSeparatorComponents(sep =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(text =>
      text.setContent(
`💰 **Price:** ${data.price}
🆔 **Order ID:** #${id}
👤 **Seller:** <@${data.customer}>`
      )
    );

  return container;
}

// ======================================================
// MODULE EXPORT
// ======================================================
module.exports = (client) => {

  // ======================= SETUP BUTTON =======================
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

  // ======================= INTERACTIONS =======================
  client.on(Events.InteractionCreate, async (interaction) => {

    // ================= OPEN ORDER MODAL =================
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
  components: [buildOrderContainer(id, orderData.orders[id]), row],
  flags: MessageFlags.IsComponentsV2
});

orderData.orders[id].messageId = orderMessage.id;
saveOrders();

      return interaction.reply({ content: "✅ Order Sent!", ephemeral: true });
    }

    // ================= ACCEPT =================
    if (interaction.isButton() && interaction.customId.startsWith("accept_")) {

      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];
      if (!data) return interaction.editReply({ content: "❌ Order not found." });
      if (data.status === "accepted")
        return interaction.editReply({ content: "❌ Already accepted." });

      data.status = "accepted";
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
        components: [interaction.message.components[0], disabledRow]
      });

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

      const ticketButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${id}`)
          .setLabel("🔒 Close")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("open_rating")
          .setLabel("⭐ Feedback")
          .setStyle(ButtonStyle.Success)
      );

      await ticket.send({
        components: [buildOrderContainer(id, data), ticketButtons],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.editReply({ content: `✅ Ticket created: ${ticket}` });
    }

    // ================= MANAGE =================
    if (interaction.isButton() && interaction.customId.startsWith("manage_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];
      if (!data)
        return interaction.reply({ content: "❌ Order not found.", ephemeral: true });

      if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID))
        return interaction.reply({ content: "❌ No permission.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`edit_${id}`)
        .setTitle("Edit Order");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("service")
            .setLabel("Service")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(data.service)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("price")
            .setLabel("Price")
            .setStyle(TextInputStyle.Short)
            .setValue(data.price)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("image")
            .setLabel("Image URL")
            .setStyle(TextInputStyle.Short)
            .setValue(data.image || "")
        )
      );

      return interaction.showModal(modal);
    }

// ================= UPDATE ORDER =================
if (interaction.isModalSubmit() && interaction.customId.startsWith("edit_")) {

  const id = interaction.customId.split("_")[1];
  const data = orderData.orders[id];

  if (!data)
    return interaction.reply({ content: "❌ Order not found.", ephemeral: true });

  // تحديث البيانات
  data.service = interaction.fields.getTextInputValue("service");
  data.price = interaction.fields.getTextInputValue("price");
  data.image = interaction.fields.getTextInputValue("image") || null;

  saveOrders();

  try {
    const channel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID);
    const message = await channel.messages.fetch(data.messageId);

    await message.edit({
      components: [
        buildOrderContainer(id, data),
        message.components[1]
      ],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (err) {
    console.log("Failed to update order message:", err);
  }

  return interaction.reply({
    content: "✅ Order updated successfully.",
    ephemeral: true
  });
}

    // ================= CLOSE =================
    if (interaction.isButton() && interaction.customId.startsWith("close_")) {

      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];

      await interaction.channel.setParent(CLOSED_CATEGORY_ID);

      return interaction.editReply({
        content: "🔒 Ticket moved to Closed."
      });
    }

  });

};
