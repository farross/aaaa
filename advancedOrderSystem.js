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
  EmbedBuilder,
  MessageCollector
} = require('discord.js');

const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');

// ====== IDs (عدّلهم لو لازم) ======
const ORDER_CHANNEL_ID = "1474602944983990290"; // قناة الأوردارات
const GAMERS_ROLE_ID = "1474602944983990290"; // الرول اللي يتمنشن أول ما الأوردر ينزل
const TICKETS_CATEGORY_ID = "1474602945579450458"; // كاتيجوري 𝐓𝐢𝐜𝐤𝐞𝐭𝐬
const STAFF_ROLE_ID = null; // حط ID للإدارة لو عايز، أو سيبه null

// Banner (عريض) زي بتاعك
const BANNER_URL = "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg";

// Cooldown
const COOLDOWN = 60000;
const cooldowns = new Map();

// قفل بسيط لمنع ناس تستلم نفس الأوردر في نفس اللحظة
const orderLocks = new Set();

// ====== Mini DB ======
let orderData = { count: 0, orders: {}, setup: { squareImageUrl: null, squareSize: null } };

if (fs.existsSync('./orders.json')) {
  try {
    orderData = JSON.parse(fs.readFileSync('./orders.json', 'utf8'));
    if (!orderData.orders) orderData.orders = {};
    if (!orderData.setup) orderData.setup = { squareImageUrl: null, squareSize: null };
  } catch (err) {
    console.error("Error reading orders.json:", err);
  }
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

async function validateSquareImage(url, size) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const meta = await sharp(res.data).metadata();
    if (!meta.width || !meta.height) throw new Error("Cannot read image metadata.");
    if (meta.width !== meta.height) throw new Error("Image is not square.");
    if (meta.width !== size) throw new Error(`Invalid size. Required ${size}x${size}, got ${meta.width}x${meta.height}`);
    return true;
  } catch (err) {
    throw err;
  }
}
function buildOrderEmbed({ id, service, price, code, sellerId, status }) {
  const square = orderData.setup?.squareImageUrl || null;

  const statusLine =
    status === "pending" ? "⏳ **Status:** Pending" :
    status === "active" ? "⚡ **Status:** Active" :
    status === "completed" ? "✅ **Status:** ~~DONE~~" : // Strikethrough هنا
    `**Status:** ${status}`;

  const embed = new EmbedBuilder()
    .setColor(status === "completed" ? 0x2ecc71 : status === "active" ? 0xf1c40f : 0x95a5a6)
    .setTitle("🖤 BOOSTFIY STORE")
    .setDescription(
      [
        "📦 **Order Details**",
        "```",
        service,
        "```",
        `💰 **Price:** ${price}`,
        `🔑 **Code:** ${code || "None"}`,
        "",
        `🆔 **Order ID:** #${id}`,
        `👤 **Seller:** ${sellerId ? `<@${sellerId}>` : "None"}`,
        statusLine
      ].join("\n")
    )
    .setImage(BANNER_URL);

  if (square) embed.setThumbnail(square);

  return embed;
}

function buildOrderButtons({ id, status }) {
  const row = new ActionRowBuilder();

  if (status === "pending") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`collect_${id}`).setLabel("Collect").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`manage_${id}`).setLabel("Manage").setStyle(ButtonStyle.Secondary)
    );
  } else if (status === "active") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`manage_${id}`).setLabel("Manage").setStyle(ButtonStyle.Secondary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId(`done_${id}`).setLabel("DONE").setStyle(ButtonStyle.Success).setDisabled(true)
    );
  }

  return row;
}

async function editOrderMessage(guild, orderId) {
  const data = orderData.orders[orderId];
  if (!data?.orderChannelId || !data?.orderMessageId) return;

  const ch = await guild.channels.fetch(data.orderChannelId).catch(() => null);
  if (!ch || !ch.isTextBased()) return;

  const msg = await ch.messages.fetch(data.orderMessageId).catch(() => null);
  if (!msg) return;

  const embed = buildOrderEmbed({
    id: orderId,
    service: data.service,
    price: data.price,
    code: data.code,
    sellerId: data.seller,
    status: data.status
  });

  const row = buildOrderButtons({ id: orderId, status: data.status });

  await msg.edit({ embeds: [embed], components: [row] });
}

async function createTicketChannel(interaction, orderId) {
  const data = orderData.orders[orderId];
  const guild = interaction.guild;

  const category = await guild.channels.fetch(TICKETS_CATEGORY_ID).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.reply({ content: "❌ Tickets category not found.", ephemeral: true });
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: data.customer, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
    { id: data.seller, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
  ];

  if (STAFF_ROLE_ID) {
    overwrites.push({ id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-order-${orderId}`,
    type: ChannelType.GuildText,
    parent: TICKETS_CATEGORY_ID,
    permissionOverwrites: overwrites
  });

  data.ticketChannelId = ticketChannel.id;
  saveOrders();

  // رسالة في التيكت مع زرار Mark as Done
  const ticketEmbed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`Ticket for Order #${orderId}`)
    .setDescription(`مرحبا <@${data.seller}> و <@${data.customer}>! هنا تفاصيل الطلب:\n\n${data.service}\n\nعند الانتهاء، اضغط "Mark as Done".`);

  const ticketRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`complete_${orderId}`).setLabel("Mark as Done").setStyle(ButtonStyle.Success)
  );

  await ticketChannel.send({ embeds: [ticketEmbed], components: [ticketRow] });

  return ticketChannel;
}
module.exports = (client) => {

  // ===== !setup-order (للأدمن: اختيار صورة مربعة) =====
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === "!setup-order") {
      if (!isAdmin(message.member)) return message.reply("❌ أنت مش أدمن.");

      const sizeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("size_256").setLabel("256x256").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("size_512").setLabel("512x512").setStyle(ButtonStyle.Primary)
      );

      const sizeMsg = await message.reply({ content: "اختار مقاس الصورة المربعة:", components: [sizeRow] });

      const sizeCollector = sizeMsg.createMessageComponentCollector({ time: 60000 });

      sizeCollector.on('collect', async (int) => {
        if (int.user.id !== message.author.id) return;

        const size = int.customId === "size_256" ? 256 : 512;
        await int.update({ content: `تم اختيار ${size}x${size}. أرسل الصورة كـattachment الآن.`, components: [] });

        const imgCollector = message.channel.createMessageCollector({
          filter: (m) => m.author.id === message.author.id && m.attachments.size > 0,
          max: 1,
          time: 60000
        });

        imgCollector.on('collect', async (m) => {
          const attachment = m.attachments.first();
          if (!attachment.contentType.startsWith('image/')) return m.reply("❌ هذه مش صورة.");

          try {
            await validateSquareImage(attachment.proxyURL, size);
            orderData.setup.squareImageUrl = attachment.proxyURL;
            orderData.setup.squareSize = size;
            saveOrders();
            m.reply("✅ تم حفظ الصورة بنجاح! ستظهر كـThumbnail في الأوردارات.");
          } catch (err) {
            m.reply(`❌ خطأ: ${err.message}`);
          }
        });

        imgCollector.on('end', (collected) => {
          if (!collected.size) message.reply("❌ انتهى الوقت بدون إرسال صورة.");
        });

        sizeCollector.stop();
      });
    }

    // ===== إرسال رسالة التقديم (بدء أوردر) =====
    if (message.content === "!setup-start") { // أمر لإرسال زرار البداية
      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("start_order").setLabel("🚀 Start Order").setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({ content: "اضغط لبدء طلب جديد 👇", components: [button] });
    }
  });
    // ===== التفاعل مع الأزرار والمودال =====
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.inGuild()) return;

    // 1. زرار بداية الطلب
    if (interaction.isButton() && interaction.customId === "start_order") {
      if (cooldowns.has(interaction.user.id)) {
        const remaining = (cooldowns.get(interaction.user.id) - Date.now()) / 1000;
        if (remaining > 0) return interaction.reply({ content: `⏳ استنى ${remaining.toFixed(0)} ثانية`, ephemeral: true });
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
        service,
        price,
        code,
        seller: null,
        status: "pending",
        customer: interaction.user.id,
        orderChannelId: ORDER_CHANNEL_ID,
        orderMessageId: null, // سيتم تحديثه
        ticketChannelId: null
      };
      saveOrders();

      const orderChannel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID).catch(() => null);
      if (!orderChannel) return interaction.reply({ content: "❌ Order channel مش موجود", ephemeral: true });

      const embed = buildOrderEmbed({ id: orderNumber, service, price, code, sellerId: null, status: "pending" });
      const row = buildOrderButtons({ id: orderNumber, status: "pending" });

      const orderMsg = await orderChannel.send({
        content: `<@&${GAMERS_ROLE_ID}>`, // منشن الرول أول ما ينزل
        embeds: [embed],
        components: [row]
      });

      orderData.orders[orderNumber].orderMessageId = orderMsg.id;
      saveOrders();

      return interaction.reply({ content: "✅ تم إرسال طلبك بنجاح!", ephemeral: true });
    }

    // 3. زرار Collect
    if (interaction.isButton() && interaction.customId.startsWith("collect_")) {
      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب ده مش موجود.", ephemeral: true });
      if (data.seller) return interaction.reply({ content: "❌ الطلب ده حد تاني استلمه.", ephemeral: true });
      if (orderLocks.has(id)) return interaction.reply({ content: "❌ جاري استلام الطلب بواسطة آخر.", ephemeral: true });

      orderLocks.add(id);

      try {
        data.seller = interaction.user.id;
        data.status = "active";
        saveOrders();

        await createTicketChannel(interaction, id); // فتح تيكت وسحب الناس

        await editOrderMessage(interaction.guild, id);

        await interaction.reply({ content: `✅ تم استلام الطلب بواسطة <@${data.seller}>!`, ephemeral: false }); // منشن السيلر
      } catch (err) {
        console.error(err);
        interaction.reply({ content: "❌ خطأ في استلام الطلب.", ephemeral: true });
      } finally {
        orderLocks.delete(id);
      }
    }

    // 4. زرار Mark as Done (في التيكت)
    if (interaction.isButton() && interaction.customId.startsWith("complete_")) {
      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب ده مش موجود.", ephemeral: true });
      if (data.seller !== interaction.user.id) return interaction.reply({ content: "❌ أنت مش السيلر عشان تنهي الطلب!", ephemeral: true });
      if (data.status === "completed") return interaction.reply({ content: "❌ الطلب منتهي بالفعل.", ephemeral: true });

      data.status = "completed";
      saveOrders();

      await editOrderMessage(interaction.guild, id
