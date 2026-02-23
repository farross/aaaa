const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
  Events,
  ContainerBuilder,
  SeparatorSpacingSize,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');
const fs = require('fs');

// ================= الإعدادات =================
const ORDER_CHANNEL_ID = "1474602944983990290"; // روم نزول الطلبات
const GAMERS_ROLE_ID = "1474602944983990290"; // رتبة الجيمرز
const TICKET_CATEGORY_ID = "1474602944983990290"; // أيدي كاتيجوري التيكت
const DEFAULT_BANNER = "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg";

const COOLDOWN = 60000;
const cooldowns = new Map();

// ================= قاعدة البيانات =================
let orderData = { count: 0, orders: {}, config: { image: DEFAULT_BANNER } };
if (fs.existsSync('./orders.json')) {
  try {
    orderData = JSON.parse(fs.readFileSync('./orders.json'));
    if (!orderData.orders) orderData.orders = {};
    if (!orderData.config) orderData.config = { image: DEFAULT_BANNER };
  } catch (err) {
    console.error("Error reading orders.json:", err);
  }
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

module.exports = (client) => {

  // ===== إرسال رسالة التقديم =====
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // أمر السيت اب مع إمكانية وضع رابط صورة مربعة
    if (message.content.startsWith("!setup-order")) {
      const args = message.content.split(" ");
      const imageUrl = args[1] || DEFAULT_BANNER;
      
      orderData.config.image = imageUrl;
      saveOrders();

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("start_order")
          .setLabel("🚀 Start Order")
          .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({
        content: "اضغط لبدء طلب جديد 👇",
        components: [button]
      });
    }
  });

  // ===== التفاعل مع الزراير والمودال =====
  client.on(Events.InteractionCreate, async (interaction) => {

    // 1. زرار بداية الطلب
    if (interaction.isButton() && interaction.customId === "start_order") {
      if (cooldowns.has(interaction.user.id)) {
        const remaining = (cooldowns.get(interaction.user.id) - Date.now()) / 1000;
        if (remaining > 0)
          return interaction.reply({ content: `⏳ استنى ${remaining.toFixed(0)} ثانية`, ephemeral: true });
      }
      cooldowns.set(interaction.user.id, Date.now() + COOLDOWN);

      const modal = new ModalBuilder().setCustomId("order_modal").setTitle("New Order");

      const detailsInput = new TextInputBuilder().setCustomId("service").setLabel("Order Details (Service)").setStyle(TextInputStyle.Paragraph).setRequired(true);
      const priceInput = new TextInputBuilder().setCustomId("price").setLabel("Price").setStyle(TextInputStyle.Short).setRequired(true);
      const codeInput = new TextInputBuilder().setCustomId("code").setLabel("Code / Extra Notes").setStyle(TextInputStyle.Short).setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(detailsInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(codeInput)
      );

      return interaction.showModal(modal);
    }

    // 2. استلام بيانات المودال (إنشاء الطلب)
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {
      orderData.count++;
      const orderNumber = orderData.count;

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");
      const code = interaction.fields.getTextInputValue("code") || "None";

      orderData.orders[orderNumber] = {
        service: service,
        price: price,
        code: code,
        seller: null,
        status: "pending",
        customer: interaction.user.id
      };
      saveOrders();

      const orderChannel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID).catch(() => null);
      if (!orderChannel) return interaction.reply({ content: "❌ Order channel مش موجود", ephemeral: true });

      const container = new ContainerBuilder()
        .addMediaGalleryComponents(media => media.addItems(new MediaGalleryItemBuilder().setURL(orderData.config.image)))
        .addSeparatorComponents(sep => sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(text => text.setContent(
`## 🖤 BOOSTFIY STORE

📦 **Order Details**
\`\`\`
${service}
\`\`\`

💰 **Price:** ${price}
🔑 **Code:** ${code}

🆔 **Order ID:** #${orderNumber}
👤 **Seller:** None`
        ));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`collect_${orderNumber}`).setLabel("Collect").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`manage_${orderNumber}`).setLabel("Manage").setStyle(ButtonStyle.Secondary)
      );

      // منشن للـ Gamers في محتوى الرسالة
      await orderChannel.send({
        content: `📢 **NEW ORDER** <@&${GAMERS_ROLE_ID}>`,
        components: [container, row],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.reply({ content: "✅ تم إرسال طلبك بنجاح!", ephemeral: true });
    }

    // 3. زرار الاستلام (Collect) وفتح التيكت
    if (interaction.isButton() && interaction.customId.startsWith("collect_")) {
      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب ده مش موجود.", ephemeral: true });
      if (data.seller) return interaction.reply({ content: "❌ الطلب ده حد تاني استلمه قبلك.", ephemeral: true });

      data.seller = interaction.user.id;
      data.status = "active";
      saveOrders();

      // إنشاء التيكت
      const ticketName = `ticket-${id}`;
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // منع الجميع
          { id: data.customer, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, // العميل
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] } // الجيمر اللي استلم
        ]
      });

      // رسالة الترحيب في التيكت مع المنشن
      await ticketChannel.send(`أهلاً بك <@${data.customer}>، الجيمر <@${interaction.user.id}> استلم طلبك رقم #${id} وهيبدأ فيه حالاً!`);

      // تحديث رسالة الطلب
      const activeContainer = new ContainerBuilder()
        .addMediaGalleryComponents(media => media.addItems(new MediaGalleryItemBuilder().setURL(orderData.config.image)))
        .addSeparatorComponents(sep => sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(text => text.setContent(
`## ⚡ ORDER ACTIVE

📦 **Order Details**
\`\`\`
${data.service}
\`\`\`

💰 **Price:** ${data.price}
🔑 **Code:** ${data.code}

🆔 **Order ID:** #${id}
👤 **Seller:** <@${data.seller}>`
        ));

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`complete_${id}`).setLabel("Complete").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`manage_${id}`).setLabel("Manage").setStyle(ButtonStyle.Secondary)
      );

      await interaction.message.edit({ content: "", components: [activeContainer, newRow], flags: MessageFlags.IsComponentsV2 });
      return interaction.reply({ content: `✅ تم استلام الطلب وفتح تيكت: <#${ticketChannel.id}>`, ephemeral: true });
    }

    // 4. زرار الإدارة (Manage)
    if (interaction.isButton() && interaction.customId.startsWith("manage_")) {
      const id = interaction.customId.split("_")[1];
      
      const manageRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`unclaim_${id}`).setLabel("Unclaim (سحب الطلب)").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`delete_${id}`).setLabel("Delete (حذف الطلب)").setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ content: "⚙️ اختر إجراء الإدارة:", components: [manageRow], ephemeral: true });
    }

    // 5. سحب الطلب (Unclaim)
    if (interaction.isButton() && interaction.customId.startsWith("unclaim_")) {
      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];
      if (!data) return interaction.update({ content: "❌ الطلب غير موجود.", components: [] });

      data.seller = null;
      data.status = "pending";
      saveOrders();

      const container = new ContainerBuilder()
        .addMediaGalleryComponents(media => media.addItems(new MediaGalleryItemBuilder().setURL(orderData.config.image)))
        .addSeparatorComponents(sep => sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(text => text.setContent(
`## 🖤 BOOSTFIY STORE

📦 **Order Details**
\`\`\`
${data.service}
\`\`\`

💰 **Price:** ${data.price}
🔑 **Code:** ${data.code}

🆔 **Order ID:** #${id}
👤 **Seller:** None`
        ));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`collect_${id}`).setLabel("Collect").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`manage_${id}`).setLabel("Manage").setStyle(ButtonStyle.Secondary)
      );

      // البحث عن الرسالة الأصلية وتحديثها
      const orderChannel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID);
      const messages = await orderChannel.messages.fetch({ limit: 50 });
      const targetMessage = messages.find(m => m.components[0]?.components[0]?.customId?.includes(id));

      if (targetMessage) {
        await targetMessage.edit({ content: `📢 **ORDER UNCLAIMED** <@&${GAMERS_ROLE_ID}>`, components: [container, row], flags: MessageFlags.IsComponentsV2 });
      }

      return interaction.update({ content: "✅ تم سحب الطلب ورجوعه للقائمة.", components: [] });
    }

    // 6. حذف الطلب (Delete)
    if (interaction.isButton() && interaction.customId.startsWith("delete_")) {
      const id = interaction.customId.split("_")[1];
      delete orderData.orders[id];
      saveOrders();

      const orderChannel =
