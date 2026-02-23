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

const FEEDBACK_CHANNEL_ID = "حط_ايدي_روم_الفيدباك";

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

      await feedbackChannel.send({
        content:
`⭐ **New Rating**

👤 User: <@${interaction.user.id}>
⭐ Rating: ${stars}/5
📝 Feedback:
${feedback}`
      });

      return interaction.reply({
        content: "✅ Thank you for your feedback!",
        ephemeral: true
      });
    }

  });

};
