// ======================================================
// Feedback System - Container Version (V2)
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
let ratingData = { ratings: [] };

if (fs.existsSync('./ratings.json')) {
  ratingData = JSON.parse(fs.readFileSync('./ratings.json'));
}

function saveRatings() {
  fs.writeFileSync('./ratings.json', JSON.stringify(ratingData, null, 2));
}

// ======================================================
// MODULE EXPORT
// ======================================================
module.exports = (client) => {

  // ======================= RATE COMMAND =======================
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === "!rate") {
      return message.channel.send({
        content: "Click the button to rate 👇",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("open_rating")
              .setLabel("⭐ Rate Now")
              .setStyle(ButtonStyle.Primary)
          )
        ]
      });
    }
  });

  // ======================= INTERACTIONS =======================
  client.on(Events.InteractionCreate, async (interaction) => {

    // ================= OPEN MODAL =================
    if (interaction.isButton() && interaction.customId === "open_rating") {

      const modal = new ModalBuilder()
        .setCustomId("rating_modal")
        .setTitle("Rate Your Experience");

      const starsInput = new TextInputBuilder()
        .setCustomId("stars")
        .setLabel("Rating (1-5)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const feedbackInput = new TextInputBuilder()
        .setCustomId("feedback")
        .setLabel("Your Feedback")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(starsInput),
        new ActionRowBuilder().addComponents(feedbackInput)
      );

      return interaction.showModal(modal);
    }

    // ================= SUBMIT FEEDBACK =================
    if (interaction.isModalSubmit() && interaction.customId === "rating_modal") {

      const stars = interaction.fields.getTextInputValue("stars");
      const feedback = interaction.fields.getTextInputValue("feedback");

      if (!["1","2","3","4","5"].includes(stars)) {
        return interaction.reply({
          content: "❌ Rating must be between 1 and 5.",
          ephemeral: true
        });
      }

      ratingData.ratings.push({
        user: interaction.user.id,
        stars: stars,
        feedback: feedback,
        date: new Date()
      });

      saveRatings();

      const feedbackChannel = await interaction.guild.channels.fetch(FEEDBACK_CHANNEL_ID);

      const starsVisual =
        "⭐".repeat(parseInt(stars)) +
        "☆".repeat(5 - parseInt(stars));

      // ================= CONTAINER =================
      const container = new ContainerBuilder()

        .addTextDisplayComponents(text =>
          text.setContent(
`## ⭐ NEW FEEDBACK

👤 **User:** <@${interaction.user.id}>
🌟 **Rating:** ${starsVisual}`
          )
        )

        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )

        .addTextDisplayComponents(text =>
          text.setContent(
`### 📝 Feedback

> ${feedback}`
          )
        )

        .addSeparatorComponents(sep =>
          sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )

        .addMediaGalleryComponents(media =>
          media.addItems(
            new MediaGalleryItemBuilder().setURL(BANNER_URL)
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
