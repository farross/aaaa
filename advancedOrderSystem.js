// =============================
// =============================
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

// =============================
// الإعدادات الأساسية
// =============================
const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474625885062697161";
const COMMUNITY_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_ID = "1474602945579450458";
const CLOSED_CATEGORY_ID = "1474602945579450459";
const ORDER_ROLE_ID = "1474602944602177730";
const MANAGER_ROLE_ID = "1474602944602177730";

const BANNER_URL = "https://cdn.discordapp.com/attachments/1474602944983990282/1475360402660524093/Black_Geometric_Minimalist_Gaming_Logo_-_2_-_Edited.png";

// =============================
// نظام التخزين
// =============================
let orderData = { count: 0, orders: {} };

if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

// =============================
// تشغيل الموديول
// =============================
module.exports = (client) => {

  // =============================
  // أمر إنشاء زر بدء الطلب
  // =============================
  client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;

    if (message.content === "!setup-order") {

      if (!message.member.roles.cache.has(ORDER_ROLE_ID)) {
        return message.reply("❌ ليس لديك صلاحية لاستخدام هذا الأمر.");
      }

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
    }
  });

  // =============================
  // كل التفاعلات
  // =============================
  client.on(Events.InteractionCreate, async (interaction) => {

    // =============================
    // فتح مودال إنشاء الطلب
    // =============================
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
            .setRequired(false)
        )
      );

      return interaction.showModal(modal);
    }

    // =============================
    // إنشاء الطلب وإرساله
    // =============================
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {

      orderData.count++;
      const orderNumber = orderData.count;

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");
      const image = interaction.fields.getTextInputValue("image") || null;

      orderData.orders[orderNumber] = {
        service,
        price,
        image,
        status: "pending",
        customer: interaction.user.id
      };

      saveOrders();

      const orderChannel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID);

      const container = new ContainerBuilder()
        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(BANNER_URL))
        )
        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(text =>
          text.setContent(
`## 📢 NEW ORDER <@&${GAMERS_ROLE_ID}>

### 📦 تفاصيل الطلب
\`\`\`
${service}
\`\`\``
          )
        );

      if (image && image.startsWith("http")) {
        container.addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(image))
        );
      }

      container
        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(text =>
          text.setContent(
`💰 **Price:** ${price}
🆔 **Order ID:** #${orderNumber}
👤 **Seller:** <@${interaction.user.id}>`
          )
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${orderNumber}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`manage_${orderNumber}`)
          .setLabel("Manage")
          .setStyle(ButtonStyle.Secondary)
      );

      await orderChannel.send({
        components: [container, row],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.reply({ content: "✅ تم إرسال طلبك!", ephemeral: true });
    }

    // =============================
    // قبول الطلب وفتح تيكيت
    // =============================
    if (interaction.isButton() && interaction.customId.startsWith("accept_")) {

      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data)
        return interaction.editReply({ content: "❌ الطلب غير موجود." });

      if (data.status === "accepted")
        return interaction.editReply({ content: "❌ الطلب تم قبوله بالفعل." });

      data.status = "accepted";
      saveOrders();

      // تعطيل زر Accept
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

      // إنشاء التيكيت
      const ticketChannel = await interaction.guild.channels.create({
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

      await ticketChannel.send({
        content: `🎫 Order Ticket for <@${data.customer}>`,
        components: [ticketButtons]
      });

      return interaction.editReply({
        content: `✅ Ticket created: ${ticketChannel}`
      });
    }

    // =============================
    // إغلاق التيكيت
    // =============================
    if (interaction.isButton() && interaction.customId.startsWith("close_")) {

      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data)
        return interaction.editReply({ content: "❌ Ticket not found." });

      await interaction.channel.setParent(CLOSED_CATEGORY_ID);

      const disabledButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${id}`)
          .setLabel("🔒 Closed")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("open_rating")
          .setLabel("⭐ Feedback")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.message.edit({
        components: [disabledButtons]
      });

      return interaction.editReply({
        content: "🔒 Ticket closed successfully."
      });
    }

  });

};
