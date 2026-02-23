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

// ====== DATABASE ======
let db = { count: 0, config: { image: DEFAULT_BANNER }, orders: {} };

function loadDb() {
  if (!fs.existsSync(DB_FILE)) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    db.count = parsed.count ?? 0;
    db.config = { image: parsed.config?.image ?? DEFAULT_BANNER };
    db.orders = parsed.orders ?? {};
  } catch (e) {
    console.error("DB Error:", e);
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

// ====== UI BUILDERS ======
function buildContainer(status, orderId, order) {
  const img = db.config.image || DEFAULT_BANNER;

  const header =
    status === "completed"
      ? "## ✅ ORDER COMPLETED"
      : status === "active"
      ? "## ⚡ ORDER ACTIVE"
      : "## 🖤 BOOSTFIY STORE";

  const details =
    status === "completed"
      ? `~~${order.service}~~`
      : `\`\`\`\n${order.service}\n\`\`\``;

  const sellerLine = order.seller ? `<@${order.seller}>` : "None";

  const content = `${header}

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
  if (!order?.orderMessageId) return;

  const ch = await guild.channels.fetch(order.orderChannelId).catch(() => null);
  if (!ch) return;

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

  await ch.permissionOverwrites.edit(order.customer, {
    SendMessages: false
  });
  if (order.seller) {
    await ch.permissionOverwrites.edit(order.seller, {
      SendMessages: false
    });
  }
}

// ====== EXPORT ======
module.exports = (client) => {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

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

    // ===== START =====
    if (interaction.isButton() && interaction.customId === "start_order") {
      const until = cooldowns.get(interaction.user.id) || 0;
      if (Date.now() < until)
        return interaction.reply({ content: "⏳ استنى شوية.", ephemeral: true });

      cooldowns.set(interaction.user.id, Date.now() + COOLDOWN);

      const modal = new ModalBuilder()
        .setCustomId("order_modal")
        .setTitle("New Order")
        .addComponents(
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
              .setLabel("Code / Notes")
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

      const ch = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID);
      const container = buildContainer("pending", orderId, db.orders[orderId]);
      const row = buildRow("pending", orderId);

      const sent = await ch.send({
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
      if (!order || order.status !== "pending")
        return interaction.reply({ content: "❌ غير متاح.", ephemeral: true });

      order.seller = interaction.user.id;
      order.status = "active";
      saveDb();

      const ticket = await interaction.guild.channels.create({
        name: `ticket-${orderId}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID
      });

      order.ticketChannelId = ticket.id;
      saveDb();

      await updateOrderMessage(interaction.guild, orderId);

      return interaction.reply({
        content: `✅ تم استلام الطلب.`,
        ephemeral: true
      });
    }

    // ===== COMPLETE =====
    if (interaction.isButton() && interaction.customId.startsWith("complete_")) {
      const orderId = interaction.customId.split("_")[1];
      const order = db.orders[orderId];
      if (!order || !canManage(interaction, order))
        return interaction.reply({ content: "❌ مفيش صلاحية.", ephemeral: true });

      order.status = "completed";
      saveDb();

      await lockTicket(interaction.guild, order);
      await updateOrderMessage(interaction.guild, orderId);

      return interaction.reply({ content: "✅ تم إنهاء الطلب.", ephemeral: true });
    }

    // ===== UNCLAIM =====
    if (interaction.isButton() && interaction.customId.startsWith("unclaim_")) {
      const orderId = interaction.customId.split("_")[1];
      const order = db.orders[orderId];
      if (!order || !canManage(interaction, order))
        return interaction.reply({ content: "❌ مفيش صلاحية.", ephemeral: true });

      order.seller = null;
      order.status = "pending";
      saveDb();

      await updateOrderMessage(interaction.guild, orderId);

      return interaction.reply({ content: "🔄 رجع Pending.", ephemeral: true });
    }

  });
};
