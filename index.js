require('./db');

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log('BOOSTFIY FULL SYSTEM Ready 👑');
});

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isButton()) return;

  if (interaction.customId === 'collect') {

    await interaction.deferReply({ ephemeral: true });

    try {

      const category = interaction.guild.channels.cache.find(
        c => c.name === "𝐓𝐢𝐜𝐤𝐞𝐭𝐬" && c.type === 4
      );

      if (!category) {
        return interaction.editReply("❌ كاتيجوري 𝐓𝐢𝐜𝐤𝐞𝐭𝐬 مش موجودة.");
      }

      const existing = interaction.guild.channels.cache.find(
        c => c.name === `ticket-${interaction.user.id}`
      );

      if (existing) {
        return interaction.editReply("⚠️ عندك تيكت مفتوحة بالفعل.");
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.id}`,
        type: 0,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ],
          }
        ]
      });

      await channel.send(`🎟️ أهلاً ${interaction.user}  
اكتب طلبك وهيرد عليك فريق الدعم.`);

      await interaction.editReply(`✅ تم إنشاء التيكت: ${channel}`);

    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ حصل خطأ أثناء إنشاء التيكت.");
    }
  }
});

client.login(process.env.TOKEN);
