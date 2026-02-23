const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, ChannelType, Events, ContainerBuilder, SeparatorSpacingSize, MediaGalleryItemBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');

const ORDER_CHANNEL_ID = "1474602944983990290";
const GAMERS_ROLE_ID = "1474602944983990290";
const TICKET_CATEGORY_ID = "1474602944983990290";
const DEFAULT_BANNER = "https://cdn.discordapp.com/attachments/976992409219133530/1475316403241222214/Black_Geometric_Minimalist_Gaming_Logo.jpg";

const COOLDOWN = 60000;
const cooldowns = new Map();

let orderData = { count: 0, orders: {}, config: { image: DEFAULT_BANNER } };
if (fs.existsSync('./orders.json')) {
  try {
    orderData = JSON.parse(fs.readFileSync('./orders.json'));
    if (!orderData.orders) orderData.orders = {};
    if (!orderData.config) orderData.config = { image: DEFAULT_BANNER };
  } catch (err) {}
}

function saveOrders() { fs.writeFileSync('./orders.json', JSON.stringify(orderData, null, 2)); }

module.exports = (client) => {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith("!setup-order")) {
      orderData.config.image = message.content.split(" ")[1] || DEFAULT_BANNER;
      saveOrders();
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_order").setLabel("🚀 Start Order").setStyle(ButtonStyle.Primary));
      await message.channel.send({ content: "اضغط لبدء طلب جديد 👇", components: [btn] });
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton() && interaction.customId === "start_order") {
      if (cooldowns.has(interaction.user.id) && (cooldowns.get(interaction.user.id) - Date.now()) > 0) return interaction.reply({ content: "⏳ انتظر قليلا", ephemeral: true });
      cooldowns.set(interaction.user.id, Date.now() + COOLDOWN);
      const modal = new ModalBuilder().setCustomId("order_modal").setTitle("New Order");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().set
