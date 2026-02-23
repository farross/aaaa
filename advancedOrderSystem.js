const {
  Client,
  GatewayIntentBits,
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
const COMMUNITY_ROLE_ID = "PUT_COMMUNITY_ROLE_ID";
const TICKET_CATEGORY_ID = "1474602945579450458";
const LOG_CHANNEL_ID = "PUT_LOG_CHANNEL_ID";

const BANNER_URL = "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg?ex=699d0af8&is=699bb978&hm=8adc7891bc6c866e6e2427b7b7550d215561ebc66199b145daddebabc1566ac2&";
const ICON_URL = "https://media.discordapp.net/attachments/1474602944983990290/1475337012411105460/Vita_Spray_Blueprint.jpg?ex=699d1e2a&is=699bccaa&hm=e2e3aab37846afcb3e85e1d3ed56462ddfc84a760715c01cbf383b1721b9c947&=&format=webp";

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

      modal.addComponents(
        new ActionRowBuilder().addComponents(serviceInput),
        new ActionRowBuilder().addComponents(priceInput)
      );

      return interaction.showModal(modal);
    }

    // ===== Create Order =====
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {

      orderData.count++;
      const orderNumber = orderData.count;

      const service = interaction.fields.getTextInputValue("service");
      const price = interaction.fields.getTextInputValue("price");

      orderData.orders[orderNumber] = {
        service,
        price,
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
        .addMediaGalleryComponents(media =>
          media.addItems(new MediaGalleryItemBuilder().setURL(ICON_URL))
        )
        .addTextDisplayComponents(text =>
          text.setContent(
`## 📢 NEW ORDER

📦 ${service}

💰 السعر: ${price}
🆔 رقم الطلب: #${orderNumber}
👤 العميل: <@${interaction.user.id}>`
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

    // ===== ACCEPT =====
    if (interaction.isButton() && interaction.customId.startsWith("accept_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      if (!data) return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });
      if (interaction.user.id !== data.customer)
        return interaction.reply({ content: "❌ مش انت صاحب الطلب.", ephemeral: true });

      if (!interaction.member.roles.cache.has(COMMUNITY_ROLE_ID))
        return interaction.reply({ content: "❌ لازم يكون معاك رول Community.", ephemeral: true });

      data.status = "accepted";
      saveOrders();

      const cleanUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');

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

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${id}`)
          .setLabel("🔒 Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: `مرحباً <@${data.customer}> 👋`,
        components: [closeRow]
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

      if (!data) return interaction.reply({ content: "❌ الطلب غير موجود.", ephemeral: true });
      if (interaction.user.id !== data.customer)
        return interaction.reply({ content: "❌ مش انت صاحب الطلب.", ephemeral: true });

      data.status = "cancelled";
      saveOrders();

      await interaction.message.edit({ components: [] });

      return interaction.reply({ content: "❌ تم إلغاء الطلب.", ephemeral: true });
    }

    // ===== CLOSE TICKET =====
    if (interaction.isButton() && interaction.customId.startsWith("close_")) {

      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      await interaction.reply({ content: "⏳ جاري الإغلاق...", ephemeral: true });

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      let transcript = `Transcript - Order #${id}\n\n`;

      sorted.forEach(msg => {
        transcript += `[${msg.author.tag}] : ${msg.content}\n`;
      });

      const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);

      if (logChannel) {
        logChannel.send({
          files: [{
            attachment: Buffer.from(transcript, "utf-8"),
            name: `order-${id}-transcript.txt`
          }]
        });
      }

      data.status = "completed";
      saveOrders();

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }

  });

};
