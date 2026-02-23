// =============================
// استدعاء المكتبات
// =============================
const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");

// =============================
// الإعدادات
// =============================
const SHOP_CHANNEL_ID = "1474602944983990284";
const SHOP_ROLE_ID = "1474625885062697161";
const TICKET_CATEGORY_ID = "1474602945579450458";

// =============================
// المنتجات
// =============================
const PRODUCTS = [
  {
    id: "boost_14",
    name: "14 Boosts",
    description: "Discord Server Boost x14",
    price: "$10"
  },
  {
    id: "boost_30",
    name: "30 Boosts",
    description: "Discord Server Boost x30",
    price: "$20"
  },
  {
    id: "nitro",
    name: "Discord Nitro",
    description: "1 Month Nitro",
    price: "$5"
  }
];

// =============================
// تشغيل النظام
// =============================
module.exports = (client) => {

  // =============================
  // أمر إنشاء لوحة الشوب
  // =============================
  client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;
    if (message.content !== "!setup-shop") return;

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_shop")
        .setLabel("🛒 Open Shop")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: "## 🛍 Welcome to Boostify Shop",
      components: [button]
    });

  });

  // =============================
  // التفاعلات
  // =============================
  client.on(Events.InteractionCreate, async (interaction) => {

    // =============================
    // فتح الشوب
    // =============================
    if (interaction.isButton() && interaction.customId === "open_shop") {

      const menu = new StringSelectMenuBuilder()
        .setCustomId("select_product")
        .setPlaceholder("Select a product");

      PRODUCTS.forEach(product => {
        menu.addOptions({
          label: product.name,
          description: product.description,
          value: product.id
        });
      });

      const row = new ActionRowBuilder().addComponents(menu);

      return interaction.reply({
        content: "📦 Choose a product:",
        components: [row],
        ephemeral: true
      });
    }

    // =============================
    // اختيار منتج
    // =============================
    if (interaction.isStringSelectMenu() && interaction.customId === "select_product") {

      const product = PRODUCTS.find(p => p.id === interaction.values[0]);

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${product.id}`)
          .setLabel("💳 Confirm Purchase")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.update({
        content: `### 🛍 ${product.name}\n💰 Price: **${product.price}**`,
        components: [confirmRow]
      });
    }

    // =============================
    // تأكيد الشراء
    // =============================
    if (interaction.isButton() && interaction.customId.startsWith("buy_")) {

      await interaction.deferReply({ ephemeral: true });

      const productId = interaction.customId.split("_")[1];
      const product = PRODUCTS.find(p => p.id === productId);

      // إنشاء تيكت
      const ticketChannel = await interaction.guild.channels.create({
        name: `shop-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: ["ViewChannel"]
          },
          {
            id: interaction.user.id,
            allow: ["ViewChannel", "SendMessages"]
          }
        ]
      });

      ticketChannel.send({
        content: `📢 <@&${SHOP_ROLE_ID}>\n\n🛍 **New Purchase**\n👤 Buyer: <@${interaction.user.id}>\n📦 Product: **${product.name}**\n💰 Price: **${product.price}**`
      });

      return interaction.editReply({
        content: `✅ Ticket created: ${ticketChannel}`
      });
    }

  });

};

