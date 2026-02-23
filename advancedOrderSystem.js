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
const axios = require('axios');
const sharp = require('sharp');

const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474602944983990290";
const CATEGORY_ID = "1474602945579450458";

const COOLDOWN = 60000;
const cooldowns = new Map();

let orderData = {
  count: 0,
  orders: {},
  setup: {
    squareImage: null,
    size: null
  }
};

if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
}

function save() {
  fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));
}

async function validateImage(url, size) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const meta = await sharp(res.data).metadata();

  if (meta.width !== meta.height)
    throw new Error("الصورة لازم تكون مربعة");

  if (meta.width !== size)
    throw new Error(`المقاس لازم يكون ${size}x${size}`);

  return true;
}

function buildContainer(data, id) {

  const isDone = data.status === "completed";

  const serviceText = isDone
    ? `~~${data.service}~~`
    : `\`\`\`\n${data.service}\n\`\`\``;

  const container = new ContainerBuilder()
    .addMediaGalleryComponents(media =>
      media.addItems(
        new MediaGalleryItemBuilder().setURL(orderData.setup.squareImage)
      )
    )
    .addSeparatorComponents(sep =>
      sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(text =>
      text.setContent(
`## ${isDone ? "✅ ORDER COMPLETED" : data.status === "active" ? "⚡ ORDER ACTIVE" : "🖤 BOOSTFIY STORE"}

📦 **Order Details**
${serviceText}

💰 **Price:** ${data.price}
🔑 **Code:** ${data.code}

🆔 **Order ID:** #${id}
👤 **Seller:** ${data.seller ? `<@${data.seller}>` : "None"}`
      )
    );

  if (!isDone) {
    container.addActionRowComponents(row =>
      row.addComponents(
        data.status === "pending"
          ? new ButtonBuilder()
              .setCustomId(`collect_${id}`)
              .setLabel("Collect")
              .setStyle(ButtonStyle.Success)
          : new ButtonBuilder()
              .setCustomId(`complete_${id}`)
              .setLabel("Complete")
              .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`manage_${id}`)
          .setLabel("Manage")
          .setStyle(ButtonStyle.Secondary)
      )
    );
  }

  return container;
}

module.exports = (client) => {

  // ===== Setup Image =====
  client.on(Events.MessageCreate, async (msg) => {
    if (msg.content === "!setup-order") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("size_256").setLabel("256x256").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("size_512").setLabel("512x512").setStyle(ButtonStyle.Primary)
      );

      await msg.reply({ content: "اختار مقاس الصورة:", components: [row] });
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {

    // اختيار المقاس
    if (interaction.isButton() && interaction.customId.startsWith("size_")) {
      const size = interaction.customId === "size_256" ? 256 : 512;
      orderData.setup.size = size;
      save();

      await interaction.reply({ content: `ارسل صورة ${size}x${size}`, ephemeral: true });

      const collector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === interaction.user.id && m.attachments.size > 0,
        max: 1,
        time: 60000
      });

      collector.on("collect", async (m) => {
        try {
          const file = m.attachments.first();
          await validateImage(file.url, size);

          orderData.setup.squareImage = file.url;
          save();
          m.reply("✅ تم حفظ الصورة بنجاح");
        } catch (e) {
          m.reply(`❌ ${e.message}`);
        }
      });
    }

    // Start Order
    if (interaction.isButton() && interaction.customId === "start_order") {
      const modal = new ModalBuilder()
        .setCustomId("order_modal")
        .setTitle("New Order")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("service").setLabel("Service").setStyle(TextInputStyle.Paragraph)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("price").setLabel("Price").setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("code").setLabel("Code").setStyle(TextInputStyle.Short).setRequired(false)
          )
        );

      return interaction.showModal(modal);
    }

    // Submit Order
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {
      orderData.count++;
      const id = orderData.count;

      orderData.orders[id] = {
        service: interaction.fields.getTextInputValue("service"),
        price: interaction.fields.getTextInputValue("price"),
        code: interaction.fields.getTextInputValue("code") || "None",
        seller: null,
        status: "pending",
        customer: interaction.user.id
      };
      save();

      const channel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID);

      const container = buildContainer(orderData.orders[id], id);

      const msg = await channel.send({
        content: `<@&${GAMERS_ROLE_ID}>`,
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      orderData.orders[id].messageId = msg.id;
      save();

      interaction.reply({ content: "✅ تم إرسال طلبك!", ephemeral: true });
    }

    // Collect
    if (interaction.isButton() && interaction.customId.startsWith("collect_")) {
      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      data.seller = interaction.user.id;
      data.status = "active";
      save();

      const ticket = await interaction.guild.channels.create({
        name: `ticket-${id}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: data.customer, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: data.seller, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      await ticket.send(`🎫 <@${data.seller}> تم استلام الطلب من <@${data.customer}>`);

      const container = buildContainer(data, id);

      await interaction.message.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      interaction.reply({ content: `✅ <@${interaction.user.id}> استلم الطلب!`, ephemeral: false });
    }

    // Complete
    if (interaction.isButton() && interaction.customId.startsWith("complete_")) {
      const id = interaction.customId.split("_")[1];
      const data = orderData.orders[id];

      data.status = "completed";
      save();

      const container = buildContainer(data, id);

      await interaction.message.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      interaction.reply({ content: "✅ تم إنهاء الطلب", ephemeral: false });
    }

  });
};
