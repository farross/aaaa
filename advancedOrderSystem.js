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
} = require("discord.js");
const fs = require("fs");

// ====== CONFIG ======
const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474602944983990290";
const TICKET_CATEGORY_ID = "1474602944983990290";

const DEFAULT_BANNER =
  "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg";

const DB_FILE = "./orders.json";
const COOLDOWN = 60_000;
const cooldowns = new Map();

// ====== DB ======
let db = { count: 0, config: { image: DEFAULT_BANNER }, orders: {} };

function loadDb() {
  if (!fs.existsSync(DB_FILE)) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    db.count = parsed.count ?? 0;
    db.config = { image: parsed.config?.image ?? DEFAULT_BANNER };
    db.orders = parsed.orders ?? {};
  } catch (e) {
    console.error("Failed to read orders.json:", e);
  }
}
function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
loadDb();

function isAdmin(member) {
  return member?.permissions?.has(PermissionsBitField.Flags.Administrator);
}

function canManage(interaction, order) {
  return interaction.user.id === order.seller || isAdmin(interaction.member);
}

function buildContainer(status, orderId, order) {
  const img = db.config.image || DEFAULT_BANNER;

  const header =
    status === "completed"
      ? "## ✅ ORDER COMPLETED"
      : status === "active"
        ? "## ⚡ ORDER ACTIVE"
        : "## 🖤 BOOSTFIY STORE";

  // Strikethrough يشتغل كويس خارج codeblock
  const details =
    status === "completed"
      ? `~~${order.service}~~`
      : `\`\`\`\n${order.service}\n\`\`\``;

  const sellerLine = order.seller ? `<@${order.seller}>` : "None";

  const content =
`${header}

👤 **Customer:** <@${order.customer}>

📦 **Order Details**
${details}

💰 **Price:** ${order.price}
🔑 **Code:** ${order.code || "None"}

🆔 **Order ID:** #${orderId}
👤 **Seller:** ${sellerLine}`;

  return new ContainerBuilder()
    .addMediaGalleryComponents((media) =>
      media.addItems(new MediaGalleryItemBuilder().setURL(img))
    )
    .addSeparatorComponents((sep) =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents((text) => text.setContent(content));
}

function buildRow(status, orderId) {
  if (status === "completed") return null;

  if (status === "active") {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`complete_${orderId}`)
        .setLabel("Complete")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`manage_${orderId}`)
        .setLabel("Manage")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`collect_${orderId}`)
      .setLabel("Collect")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`manage_${orderId}`)
      .setLabel("Manage")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function updateOrderMessage(guild, orderId) {
  const order = db.orders[orderId];
  if (!order?.orderChannelId || !order?.orderMessageId) return;

  const ch = await guild.channels.fetch(order.orderChannelId).catch(() => null);
  if (!ch || !("messages" in ch)) return;

  const msg = await ch.messages.fetch(order.orderMessageId).catch(() => null);
  if (!msg) return;

  const container = buildContainer(order.status, orderId, order);
  const row = buildRow(order.status, orderId);

  const content =
    order.status === "pending"
      ? `📢 **NEW ORDER** <@&${GAMERS_ROLE_ID}>`
      : order.status === "active"
        ? `📌 **ORDER CLAIMED** by <@${order.seller}>`
        : `✅ **ORDER COMPLETED**`;

  await msg.edit({
    content,
    components: row ? [container, row] : [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function lockTicket(guild, order) {
  if (!order.ticketChannelId) return;
  const ch = await guild.channels.fetch(order.ticketChannelId).catch(() => null);
  if (!ch) return;

  await ch.permissionOverwrites.edit(order.customer, { SendMessages: false }).catch(() => null);
  if (order.seller) {
    await ch.permissionOverwrites.edit(order.seller, { SendMessages: false }).catch(() => null);
  }
}
module.exports = (client) => {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // !setup-order [imageUrl]
    if (message.content.startsWith("!setup-order")) {
      const imageUrl = message.content.split(/\s+/)[1];
      if (imageUrl) db.config.image = imageUrl;
      saveDb();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("start_order")
          .setLabel("🚀 Start Order")
          .setStyle(ButtonStyle.Primary)
      );

      return message.channel.send({
        content: "تم إعداد نظام الطلبات.\nاضغط لبدء طلب جديد 👇",
        components: [row]
      });
    }

    // !order => يبعت Start فقط
    if (message.content === "!order") {
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

  client.on(Events.InteractionCreate, async (interaction) => {
    // ===== START BUTTON =====
    if (interaction.isButton() && interaction.customId === "start_order") {
      const until = cooldowns.get(interaction.user.id) || 0;
      const remaining = until - Date.now();
      if (remaining > 0) {
        return interaction.reply({
          content: `⏳ استنى ${Math.ceil(remaining / 1000)} ثانية`,
          ephemeral: true
        });
      }
      cooldowns.set(interaction.user.id, Date.now() + COOLDOWN);

      const modal = new ModalBuilder()
        .setCustomId("order_modal")
        .setTitle("New Order");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("service")
            .setLabel("Order Details")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("price")
            .setLabel("Price")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("code")
            .setLabel("Code / Notes (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {
      db.count++;
      const orderId = String(db.count);

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");
      const code = interaction.fields.getTextInputValue("code") || "None";

      const ordersChannel = await interaction.guild.channels
        .fetch(ORDER_CHANNEL_ID)
        .catch(() => null);

      if (!ordersChannel) {
        return interaction.reply({ content: "❌ روم الطلبات غير موجودة.", ephemeral: true });
      }

      db.orders[orderId] = {
        customer: interaction.user.id,
        service,
        price,
        code,
        seller: null,
        status: "pending",
        ticketChannelId: null,
        orderChannelId: ORDER_CHANNEL_ID,
        orderMessageId: null
      };
      saveDb();

      const container = buildContainer("pending", orderId, db.orders[orderId]);
      const row = buildRow("pending", orderId);

      const sent = await ordersChannel.send({
        content: `📢 **NEW ORDER** <@&${GAMERS_ROLE_ID}>`,
        components: [container, row],
        flags: MessageFlags.IsComponentsV2
      });

      db.orders[orderId].orderMessageId = sent.id;
      saveDb();

      return interaction.reply({
        content: `✅ تم إرسال طلبك! رقم الطلب: #${orderId}`,
        ephemeral: true
      });
    }

    // ===== COLLECT =====
    if (interaction.isButton() && interaction.customId.startsWith("collect_")) {
      const orderId = interaction.customId.split("_")[1];
      const order = db.orders[orderId];

      if (!order) return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });
      if (order.status !== "pending") return interaction.reply({ content: "❌ الطلب مش متاح للاستلام.", ephemeral: true });
      if (order.seller) return interaction.reply({ content: "❌ الطلب اتاخد بالفعل.", ephemeral: true });

      order.seller = interaction.user.id;
      order.status = "active";
      saveDb();

      const ticket = await interaction.guild.channels.create({
        name: `ticket-${orderId}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: GAMERS_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: order.customer, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      order.ticketChannelId = ticket.id;
      saveDb();

      await ticket.send(
        `🎫 Ticket for Order #${orderId}\n` +
        `👤 Customer: <@${order.customer}>\n` +
        `🧑‍💻 Seller: <@${order.seller}>\n\n` +
        `اكتبوا هنا واتفقوا على التفاصيل.\n` +
        `لإنهاء الطلب اضغط **Complete** من رسالة الأوردر.`
      );

      await updateOrderMessage(interaction.guild, orderId);

      return interaction.reply({
        content: `✅ تم استلام الطلب وفتح تيكت: <#${ticket.id}> (Seller: <@${interaction.user.id}>)`,
        ephemeral: true
      });
    }

    // ===== MANAGE (Panel) =====
    if (interaction.isButton() && interaction.customId.startsWith("manage_")) {
      const orderId = interaction.customId.split("_")[1];
      const order = db.orders[orderId];
      if (!order) return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });

      // اسمح للإدمن أو السيلر الحالي
      if (!canManage(interaction, order) && order.status !== "pending") {
        return interaction.reply({ content: "❌ مفيش صلاحية.", ephemeral: true });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`unclaim_${orderId}`).setLabel("Unclaim").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`close_${orderId}`).setLabel("Close Ticket").setStyle
