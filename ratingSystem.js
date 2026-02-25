// ======================================================
// Feedback System - Container Version (FINAL CLEAN)
// ======================================================

const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryItemBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

const fs = require('fs');

const FEEDBACK_CHANNEL_ID = "1475373292708954286";
const BANNER_URL = "https://i.postimg.cc/hPYYRkts/2.png";

// ======================= STORAGE =======================
let feedbackData = { feedbacks: [] };

if (fs.existsSync('./ratings.json')) {
  feedbackData = JSON.parse(fs.readFileSync('./ratings.json'));
}

function saveFeedback() {
  fs.writeFileSync('./ratings.json', JSON.stringify(feedbackData, null, 2));
}

// ======================================================
// MODULE EXPORT
// ======================================================
module.exports = (client) => {

  // ======================= COMMAND =======================
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === "!rate") {
      return message.channel.send({
        content: "Click the button to Send Feedback 👇",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("open_feedback")
              .setLabel("FeedBack")
              .setStyle(ButtonStyle.Primary)
          )
        ]
      });
    }
  });

  // ======================= INTERACTIONS =======================
  client.on(Events.InteractionCreate, async (interaction) => {

    // ================= OPEN MODAL =================
    if (interaction.isButton() && interaction.customId === "open_feedback") {

      const modal = new ModalBuilder()
        .setCustomId("feedback_modal")
        .setTitle("Send Your Feedback");

      const feedbackInput = new TextInputBuilder()
        .setCustomId("feedback")
        .setLabel("اكتب رأيك هنا")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(feedbackInput)
      );

      return interaction.showModal(modal);
    }

    // ================= SUBMIT FEEDBACK =================
    if (interaction.isModalSubmit() && interaction.customId === "feedback_modal") {

      const feedback = interaction.fields.getTextInputValue("feedback");

      feedbackData.feedbacks.push({
        user: interaction.user.id,
        feedback: feedback,
        date: new Date()
      });

      saveFeedback();

      const feedbackChannel = await interaction.guild.channels.fetch(FEEDBACK_CHANNEL_ID);

      // ======= توقيت مصر =======
      const now = new Date();

      const egyptTime = new Intl.DateTimeFormat('ar-EG', {
        timeZone: 'Africa/Cairo',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(now);

      // ================= CONTAINER =================
      const container = new ContainerBuilder()

        // العنوان
        .addTextDisplayComponents(text =>
          text.setContent(
`## 📨 New Feedback From | <@${interaction.user.id}>`
          )
        )

        .addSeparatorComponents(sep =>
          sep.setDivider(false)
        )

        // الفيدباك
        .addTextDisplayComponents(text =>
          text.setContent(
`### 📝 محتوى التقييم

>>> ${feedback}`
          )
        )

        .addSeparatorComponents(sep =>
          sep.setDivider(false)
        )

        // البانر تحت
        .addMediaGalleryComponents(media =>
          media.addItems(
            new MediaGalleryItemBuilder().setURL(BANNER_URL)
          )
        )

        // التاريخ تحت البانر
        .addTextDisplayComponents(text =>
          text.setContent(
`🔹 Thanks for Your Feedback | ${egyptTime} `
          )
        );

      await feedbackChannel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      return interaction.reply({
        content: "✅ Thank you for your feedback!",
        ephemeral: true
      });
    }

  });

};
