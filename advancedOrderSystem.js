const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  Events
} = require('discord.js');
const fs = require('fs');

const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474602944983990290";
const CATEGORY_ID = "1474602944983990290";
const BANNER_URL = "https://i.imgur.com/aRB6qJZ.jpg";

const COOLDOWN = 60000;
const cooldowns = new Map();

let orderData = { count: 0 };
if (fs.existsSync('./orders.json')) {
  orderData = JSON.parse(fs.readFileSync('./orders.json'));
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
        .setCustomId("details")
        .setLabel("Order Details")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const priceInput = new TextInputBuilder()
        .setCustomId("price")
        .setLabel("Price")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const notesInput = new TextInputBuilder()
        .setCustomId("notes")
        .setLabel("Extra Notes")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(detailsInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(notesInput)
      );

      return interaction.showModal(modal);
    }

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit() && interaction.customId === "order_modal") {

      orderData.count++;
      fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2));

      const orderNumber = orderData.count;

      const details = interaction.fields.getTextInputValue("details");
      const price = interaction.fields.getTextInputValue("price");
      const notes = interaction.fields.getTextInputValue("notes");

      const orderChannel = await interaction.guild.channels.fetch(ORDER_CHANNEL_ID)
        .catch(() => null);

      if (!orderChannel)
        return interaction.reply({ content: "❌ Order channel مش موجود", ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`🛒 NEW ORDER #${orderNumber}`)
        .addFields(
          { name: "📦 Order Details", value: details },
          { name: "💰 Price", value: price },
          { name: "📝 Notes", value: notes || "No notes" }
        )
        .setImage(BANNER_URL)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: `Order by ${interaction.user.tag}` })
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${orderNumber}`)
          .setLabel("✅ Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_${orderNumber}`)
          .setLabel("❌ Reject")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ticket_${orderNumber}_${interaction.user.id}`)
          .setLabel("🎫 Create Ticket")
          .setStyle(ButtonStyle.Secondary)
      );

      await orderChannel.send({
        content: `📢 **NEW ORDER** <@&${GAMERS_ROLE_ID}>`,
        embeds: [embed],
        components: [buttons]
      });

      return interaction.reply({ content: "✅ تم إرسال طلبك!", ephemeral: true });
    }

  });
};
