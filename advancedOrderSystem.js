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

const ORDER_CHANNEL_ID = "PUT_ORDER_CHANNEL_ID";
const GAMERS_ROLE_ID = "PUT_GAMERS_ROLE_ID";
const COMMUNITY_ROLE_ID = "PUT_COMMUNITY_ROLE_ID";
const TICKET_CATEGORY_ID = "PUT_TICKET_CATEGORY_ID";

const BANNER_URL = "PUT_BANNER_URL";

const COOLDOWN = 60000;

let orderData = { count: 0, orders: {} };

if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
}

function saveOrders() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

const cooldowns = new Map();

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

    // ===== Start Order =====
    if (interaction.isButton() && interaction.customId === "start_order") {

      if (cooldowns.has(interaction.user.id)) {
        const remaining = (cooldowns.get(interaction.user.id) - Date.now()) / 1000;
        if (remaining > 0)
          return interaction.reply({ content: `⏳ استنى ${remaining.toFixed(0)} ثانية`, ephemeral: true });
      }

      cooldowns.set(interaction.user.id, Date.now() + COOLDOWN);

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

    // ===== Submit Order =====
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

        .addMediaGalleryComponents(media => {
          const items = [
            new MediaGalleryItemBuilder().setURL(BANNER_URL)
          ];

          return media.addItems(...items);
        })

        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )

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

      // إضافة صورة تحت التفاصيل لو موجودة
      if (image && image.startsWith("http")) {
        container.addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(image))
        );
      }

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

    // ===== ACCEPT =====
    if (interaction.isButton() && interaction.customId.startsWith("accept_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data)
        return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });

      if (interaction.user.id !== data.customer)
        return interaction.reply({ content: "❌ مش انت صاحب الطلب.", ephemeral: true });

      if (!interaction.member.roles.cache.has(COMMUNITY_ROLE_ID))
        return interaction.reply({ content: "❌ لازم يكون معاك رول Community.", ephemeral: true });

      data.status = "accepted";
      saveOrders();

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

      await ticketChannel.send({
        content:
`## 🎫 ORDER TICKET

🆔 رقم الطلب: #${id}

📦 التفاصيل:
\`\`\`
${data.service}
\`\`\`

💰 السعر: ${data.price}

👤 العميل: <@${data.customer}>`
      });

      await interaction.message.edit({ components: [] });

      return interaction.reply({
        content: `✅ تم فتح التيكيت: ${ticketChannel}`,
        ephemeral: true
      });
    }

    // ===== CANCEL =====
    if (interaction.isButton() && interaction.customId.startsWith("cancel_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data)
        return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });

      if (interaction.user.id !== data.customer)
        return interaction.reply({ content: "❌ مش انت صاحب الطلب.", ephemeral: true });

      data.status = "cancelled";
      saveOrders();

      await interaction.message.edit({ components: [] });

      return interaction.reply({ content: "❌ تم إلغاء الطلب.", ephemeral: true });
    }

  });

};
