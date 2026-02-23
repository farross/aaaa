const { AttachmentBuilder } = require('discord.js');

...

const imageUrl = "https://cdn.discordapp.com/attachments/976992409219133530/1474879330147635350/1.png";
const imageName = "1.png";

// تحميل الصورة كـ Attachment
const attachment = new AttachmentBuilder(imageUrl, { name: imageName });

const content = `
📢 **NEW ORDER** <@&${GAMERS_ROLE_ID}>
───────────────────────────────
🔸 Details: \`${service}\`
💰 Price: \`${price}\`
🔑 Code: ||\`${code}\`||

💎 Order: #${orderCounter} │ 👤 Seller: None
───────────────────────────────
`;

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`collect_${orderCounter}`)
    .setLabel("Collect")
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId(`manage_${orderCounter}`)
    .setLabel("Manage")
    .setStyle(ButtonStyle.Secondary)
);

const msg = await ordersChannel.send({
  content: content,
  components: [row],
  files: [attachment]
});

orders[orderCounter].messageId = msg.id;
