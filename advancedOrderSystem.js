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

const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474625885062697161";
const COMMUNITY_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_ID = "1474602945579450458";
const BANNER_URL = "https://cdn.discordapp.com/attachments/1474602944983990282/1475360402660524093/Black_Geometric_Minimalist_Gaming_Logo_-_2_-_Edited.png?ex=699d33f2&is=699be272&hm=82b643c6dfa1093f80026bfb21a55f0504e7a45c2c1689479484b1db01698fd9&";

let orderData = { count: 0, orders: {} };

if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

module.exports = (client) => {

  // =============================
  // !setup-order
  // =============================
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === "!setup-order") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("start_order")
          .setLabel("🚀 Start Order")
          .setStyle(ButtonStyle.Primary)
      );

      return message.channel.send({
        content: "اضغط لبدء طلب جديد 👇",
        components: [row]
      });
    }
  });

  // =============================
  // Interactions
  // =============================
  client.on(Events.InteractionCreate, async (interaction) => {

    // ===== فتح المودال =====
    if (interaction.isButton() && interaction.customId === "start_order") {

      const modal = new ModalBuilder()
        .setCustomId("order_modal")
        .setTitle("Create Order");

      const serviceInput = new TextInputBuilder()
        .setCustomId("service")
        .setLabel("تفاصيل الطلب")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const priceInput = new TextInputBuilder()
        .setCustomId("price")
        .setLabel("السعر")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId("image")
        .setLabel("رابط صورة (اختياري)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(serviceInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(imageInput)
      );

      return interaction.showModal(modal);
    }

    // ===== إنشاء الطلب =====
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

        // ===== البانر =====
        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(BANNER_URL))
        )

        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )

        // ===== النص + الصورة تحت التفاصيل =====
        .addTextDisplayComponents(text =>
          text.setContent(
`## 📢 NEW ORDER <@&${GAMERS_ROLE_ID}>

### 📦 تفاصيل الطلب
\`\`\`
${service}
\`\`\``
          )
        );

      // الصورة تحت التفاصيل مباشرة
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
          .setCustomId(`cancel_${orderNumber}`)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger)
      );

      await orderChannel.send({
        components: [container, row],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.reply({ content: "✅ تم إرسال طلبك!", ephemeral: true });
    }

// ===== ACCEPT (مضاد سبام + يقفل الزر) =====
if (interaction.isButton() && interaction.customId.startsWith("accept_")) {

  const id = interaction.customId.split("_")[1];
  const data = orderData.orders[id];

  if (!data)
    return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });

  // لو اتقبل قبل كده
  if (data.status === "accepted")
    return interaction.reply({ content: "❌ الطلب تم قبوله بالفعل.", ephemeral: true });

  if (interaction.user.id !== data.customer)
    return interaction.reply({ content: "❌ مش انت صاحب الطلب.", ephemeral: true });

  if (!interaction.member.roles.cache.has(COMMUNITY_ROLE_ID))
    return interaction.reply({ content: "❌ لازم يكون معاك رول Community.", ephemeral: true });

  data.status = "accepted";
  saveOrders();

  // ===== قفل الأزرار =====
  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${id}`)
      .setLabel("Accepted ✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`cancel_${id}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );

  // تحديث رسالة الأوردر الأصلية
  await interaction.message.edit({
    components: [interaction.message.components[0], disabledRow]
  });

  // ===== إنشاء التيكيت =====
  const cleanUsername = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const ticketChannel = await interaction.guild.channels.create({
    name: `${cleanUsername}-${id}`,
    type: 0,
    parent: TICKET_CATEGORY_ID,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
      { id: data.customer, allow: ['ViewChannel', 'SendMessages'] },
      { id: COMMUNITY_ROLE_ID, allow: ['ViewChannel', 'SendMessages'] }
    ]
  });

  // نفس رسالة الأوردر داخل التيكيت
  const ticketContainer = new ContainerBuilder()
    .addMediaGalleryComponents(media =>
      media.addItems(new MediaGalleryItemBuilder().setURL(BANNER_URL))
    )
    .addSeparatorComponents(sep =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(text =>
      text.setContent(
`## 🎫 ORDER TICKET

### 📦 تفاصيل الطلب
\`\`\`
${data.service}
\`\`\``
      )
    );

  if (data.image && data.image.startsWith("http")) {
    ticketContainer.addMediaGalleryComponents(media =>
      media.addItems(new MediaGalleryItemBuilder().setURL(data.image))
    );
  }

  ticketContainer
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

  await ticketChannel.send({
    components: [ticketContainer],
    flags: MessageFlags.IsComponentsV2
  });

  return interaction.reply({
    content: `✅ تم فتح التيكيت: ${ticketChannel}`,
    ephemeral: true
  });
}


    // ===== CANCEL =====
    if (interaction.isButton() && interaction.customId.startsWith("cancel_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });
      if (interaction.user.id !== data.customer)
        return interaction.reply({ content: "❌ مش انت صاحب الطلب.", ephemeral: true });

      data.status = "cancelled";
      saveOrders();

      await interaction.message.edit({ components: [] });

      return interaction.reply({ content: "❌ تم إلغاء الطلب.", ephemeral: true });
    }

  });

};
