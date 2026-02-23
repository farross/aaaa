const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const fs = require('fs');

const FEEDBACK_CHANNEL_ID = "1475373292708954286";

let ratingData = { ratings: [] };

if (fs.existsSync('./ratings.json')) {
  ratingData = JSON.parse(fs.readFileSync('./ratings.json'));
}

function saveRatings() {
  fs.writeFileSync('./ratings.json', JSON.stringify(ratingData, null, 2));
}

module.exports = (client) => {

  // أمر !rate
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === "!rate") {

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

  client.on(Events.InteractionCreate, async (interaction) => {

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

    const { ContainerBuilder, SeparatorSpacingSize, MediaGalleryItemBuilder, MessageFlags } = require('discord.js');

const BANNER_URL = "https://cdn.discordapp.com/attachments/908838301832720394/1475378885570072730/Black_Geometric_Minimalist_Gaming_Logo_-_3_-_Edited.jpg?ex=699d4529&is=699bf3a9&hm=5ea707ab42f31bd45969992ccc676599749ff36c50227c87197071f8c3075bc1&";

const avatarURL = interaction.user.displayAvatarURL({ size: 512, extension: "png" });

// تحويل الرقم لنجوم
const starsVisual = "⭐".repeat(parseInt(stars)) + "☆".repeat(5 - parseInt(stars));

const container = new ContainerBuilder()

  // ===== العنوان فوق =====
  .addTextDisplayComponents(text =>
    text.setContent(
`## 💬 NEW FEEDBACK FROM <@${interaction.user.id}>`
    )
  )

  // ===== صورة البروفايل =====
  .addMediaGalleryComponents(media =>
    media.addItems(
      new MediaGalleryItemBuilder().setURL(avatarURL)
    )
  )

  .addSeparatorComponents(sep =>
    sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
  )

  // ===== النجوم والفيدباك =====
  .addTextDisplayComponents(text =>
    text.setContent(
`⭐ **Rating:** ${starsVisual}

📝 **Feedback**
\`\`\`
${feedback}
\`\`\``
    )
  )

  .addSeparatorComponents(sep =>
    sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
  )

  // ===== البانر تحت =====
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
