// =============================
// استدعاء مكتبة discord.js
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
  MessageFlags,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');

// =============================
// الإعدادات الأساسية (عدلهم عندك)
// =============================
const ORDER_CHANNEL_ID = "1474602944983990290"; // روم الطلبات
const GAMERS_ROLE_ID = "1474602944983990290";   // رول اللي بيتمنشن
const STAFF_ROLE_ID = "1474602944983990290";    // الرول المسموح له يستلم الطلب

const BANNER_URL = "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg";
const ICON_URL = "https://cdn.discordapp.com/attachments/1474602944983990290/1475337012411105460/Vita_Spray_Blueprint.jpg?ex=699d1e2a&is=699bccaa&hm=e2e3aab37846afcb3e85e1d3ed56462ddfc84a760715c01cbf383b1721b9c947&";

const COOLDOWN = 60000; // 60 ثانية

// =============================
// نظام تخزين البيانات
// =============================
let orderData = { count: 0, orders: {} };

if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

const cooldowns = new Map();

// =============================
// تصدير الموديول
// =============================
module.exports = (client) => {

  // ==========================================
  // تسجيل سلاش كومانـد setup-order
  // ==========================================
  client.once(Events.ClientReady, async () => {

    const command = new SlashCommandBuilder()
      .setName("setup-order")
      .setDescription("إرسال زر إنشاء طلب جديد");

    await client.application.commands.create(command);

    console.log("✅ Slash Command Registered");
  });

  // ==========================================
  // التعامل مع كل التفاعلات
  // ==========================================
  client.on(Events.InteractionCreate, async (interaction) => {

    // =============================
    // تنفيذ سلاش كومانـد
    // =============================
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "setup-order") {

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("start_order")
            .setLabel("🚀 Start Order")
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({
          content: "اضغط لبدء طلب جديد 👇",
          components: [row]
        });
      }
    }

    // =============================
    // زر بدء الطلب
    // =============================
    if (interaction.isButton() && interaction.customId === "start_order") {

      if (cooldowns.has(interaction.user.id)) {
        const remaining = (cooldowns.get(interaction.user.id) - Date.now()) / 1000;
        if (remaining > 0)
          return interaction.reply({ content: `⏳ استنى ${remaining.toFixed(0)} ثانية`, ephemeral: true });
      }

      cooldowns.set(interaction.user.id, Date.now() + COOLDOWN);

      const modal = new ModalBuilder()
        .setCustomId("order_modal")
        .setTitle("Create New Order");

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

      modal.addComponents(
        new ActionRowBuilder().addComponents(serviceInput),
        new ActionRowBuilder().addComponents(priceInput)
      );

      return interaction.showModal(modal);
    }

    // =============================
    // إنشاء الطلب بعد المودال
    // =============================
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {

      orderData.count++;
      const orderNumber = orderData.count;

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");

      orderData.orders[orderNumber] = {
        service,
        price,
        seller: null,
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

        // ===== الأيقونة =====
        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(ICON_URL))
        )

        // ===== النص =====
        .addTextDisplayComponents(text =>
          text.setContent(
`## 📢 NEW ORDER <@&${GAMERS_ROLE_ID}>

### 📦 تفاصيل الطلب
\`\`\`
${service}
\`\`\`

💰 السعر: ${price}
🆔 رقم الطلب: #${orderNumber}
👤 العميل: <@${interaction.user.id}>`
          )
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`collect_${orderNumber}`)
          .setLabel("Collect")
          .setStyle(ButtonStyle.Success)
      );

      await orderChannel.send({
        components: [container, row],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.reply({ content: "✅ تم إرسال طلبك!", ephemeral: true });
    }

    // =============================
    // استلام الطلب
    // =============================
    if (interaction.isButton() && interaction.customId.startsWith("collect_")) {

      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
        return interaction.reply({ content: "❌ ليس لديك صلاحية لاستلام الطلب.", ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });
      if (data.seller) return interaction.reply({ content: "❌ الطلب مستلم بالفعل.", ephemeral: true });

      data.seller = interaction.user.id;
      data.status = "active";
      saveOrders();

      const container = new ContainerBuilder()

        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(BANNER_URL))
        )

        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )

        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(ICON_URL))
        )

        .addTextDisplayComponents(text =>
          text.setContent(
`## ⚡ ORDER ACTIVE

📦 ${data.service}

💰 السعر: ${data.price}
🆔 رقم الطلب: #${id}

👤 العميل: <@${data.customer}>
👤 البائع: <@${data.seller}>`
          )
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`complete_${id}`)
          .setLabel("Complete")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.message.edit({
        components: [container, row],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.reply({ content: "✅ تم استلام الطلب.", ephemeral: true });
    }

    // =============================
    // إنهاء الطلب
    // =============================
    if (interaction.isButton() && interaction.customId.startsWith("complete_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });
      if (data.seller !== interaction.user.id)
        return interaction.reply({ content: "❌ مش انت البائع.", ephemeral: true });

      data.status = "completed";
      saveOrders();

      const container = new ContainerBuilder()

        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(BANNER_URL))
        )

        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )

        .addTextDisplayComponents(text =>
          text.setContent(
`## ✅ ORDER COMPLETED

🆔 رقم الطلب: #${id}

👤 العميل: <@${data.customer}>
👤 البائع: <@${data.seller}>`
          )
        );

      await interaction.message.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.reply({ content: "✅ تم إنهاء الطلب بنجاح.", ephemeral: true });
    }

  });

};
