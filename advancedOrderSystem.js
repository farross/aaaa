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

const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474602944983990290";
const CATEGORY_ID = "1474602944983990290";
const BANNER_URL = "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg";

const COOLDOWN = 60000;
const cooldowns = new Map();

// تعديل بسيط في الداتا عشان نحفظ تفاصيل كل طلب
let orderData = { count: 0, orders: {} };
if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
  if (!orderData.orders) orderData.orders = {}; // للتأكد من وجود الأوبجكت
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

module.exports = (client) => {

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === "!setup-order") {
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

  client.on(Events.InteractionCreate, async (interaction) => {

    // ===== START BUTTON =====
    if (interaction.isButton() && interaction.customId === "start_order") {
      if (cooldowns.has(interaction.user.id)) {
        const remaining = (cooldowns.get(interaction.user.id) - Date.now()) / 1000;
        if (remaining > 0)
          return interaction.reply({ content: `⏳ استنى ${remaining.toFixed(0)} ثانية`, ephemeral: true });
      }

      cooldowns.set(interaction.user.id, Date.now() + COOLDOWN);

      const modal = new ModalBuilder()
        .setCustomId("order_modal")
        .setTitle("New Order");

      const detailsInput = new TextInputBuilder()
        .setCustomId("service")
        .setLabel("Order Details (Service)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const priceInput = new TextInputBuilder()
        .setCustomId("price")
        .setLabel("Price")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const codeInput = new TextInputBuilder()
        .setCustomId("code")
        .setLabel("Code / Extra Notes")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(detailsInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(codeInput)
      );

      return interaction.showModal(modal);
    }

    // ===== MODAL SUBMIT (NEW ORDER) =====
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {
      orderData.count++;
      const orderNumber = orderData.count;

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");
      const code = interaction.fields.getTextInputValue("code") || "None";

      // حفظ بيانات الطلب في الملف
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

      // بناء الـ Container الأول (طلب جديد)
      const container = new ContainerBuilder()
        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(BANNER_URL))
        )
        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(text =>
          text.setContent(
`## 🖤 BOOSTFIY STORE <@&${GAMERS_ROLE_ID}>

📦 **Order Details**
\`\`\`
${service}
\`\`\`

💰 **Price:** ${price}
🔑 **Code:** ${code}

🆔 **Order ID:** #${orderNumber}
👤 **Seller:** None`
          )
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`collect_${orderNumber}`)
          .setLabel("Collect")
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

      return interaction.reply({ content: "✅ تم إرسال طلبك بنجاح!", ephemeral: true });
    }

    // ===== COLLECT BUTTON (ACTIVE ORDER) =====
    if (interaction.isButton() && interaction.customId.startsWith("collect_")) {
      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب ده مش موجود في الداتا بيز.", ephemeral: true });
      if (data.seller) return interaction.reply({ content: "❌ الطلب ده حد تاني است
