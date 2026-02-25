// ======================================================
// Simple YouTube Music System
// ======================================================

const {
  Events,
  EmbedBuilder
} = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection
} = require('@discordjs/voice');

const play = require('play-dl');

const queues = new Map();

module.exports = (client) => {

  client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.split(" ");
    const command = args.shift()?.toLowerCase();

    // ================= PLAY =================
    if (command === "!play") {

      const query = args.join(" ");
      if (!query) return message.reply("❌ حط اسم الأغنية أو لينك.");

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel)
        return message.reply("❌ لازم تدخل فويس الأول.");

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });

      const player = createAudioPlayer();
      connection.subscribe(player);

      let url;

      if (play.yt_validate(query) === "video") {
        url = query;
      } else {
        const results = await play.search(query, { limit: 1 });
        if (!results.length)
          return message.reply("❌ ملقتش حاجة.");
        url = results[0].url;
      }

      const stream = await play.stream(url);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type
      });

      player.play(resource);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🎵 Now Playing")
        .setDescription(`[اضغط هنا للمشاهدة](${url})`);

      message.channel.send({ embeds: [embed] });
    }

    // ================= STOP =================
    if (command === "!stop") {
      const connection = getVoiceConnection(message.guild.id);
      if (!connection) return message.reply("❌ مفيش حاجة شغالة.");
      connection.destroy();
      message.reply("⏹️ تم إيقاف الموسيقى.");
    }

  });

};
