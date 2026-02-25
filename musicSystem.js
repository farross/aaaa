// ======================================================
// Advanced Music System (Queue + Controls)
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
      if (!query) return message.reply("❌ اكتب اسم الأغنية أو لينك.");

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel)
        return message.reply("❌ لازم تدخل فويس الأول.");

      let serverQueue = queues.get(message.guild.id);

      if (!serverQueue) {
        serverQueue = {
          songs: [],
          player: createAudioPlayer(),
          connection: null,
          loop: false
        };
        queues.set(message.guild.id, serverQueue);
      }

      let url;
      let title;

      if (play.yt_validate(query) === "video") {
        url = query;
        const info = await play.video_info(url);
        title = info.video_details.title;
      } else {
        const results = await play.search(query, { limit: 1 });
        if (!results.length)
          return message.reply("❌ ملقتش حاجة.");
        url = results[0].url;
        title = results[0].title;
      }

      serverQueue.songs.push({ url, title });

      if (!serverQueue.connection) {
        serverQueue.connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator
        });

        serverQueue.connection.subscribe(serverQueue.player);
        playSong(message.guild.id, message.channel);
      } else {
        message.channel.send(`➕ أضيفت للكيو: **${title}**`);
      }
    }

    // ================= SKIP =================
    if (command === "!skip") {
      const serverQueue = queues.get(message.guild.id);
      if (!serverQueue) return message.reply("❌ مفيش حاجة شغالة.");
      serverQueue.player.stop();
    }

    // ================= STOP =================
    if (command === "!stop") {
      const serverQueue = queues.get(message.guild.id);
      if (!serverQueue) return message.reply("❌ مفيش حاجة شغالة.");

      serverQueue.songs = [];
      serverQueue.connection.destroy();
      queues.delete(message.guild.id);

      message.reply("⏹️ تم إيقاف الموسيقى.");
    }

    // ================= PAUSE =================
    if (command === "!pause") {
      const serverQueue = queues.get(message.guild.id);
      if (!serverQueue) return;
      serverQueue.player.pause();
      message.reply("⏸️ تم إيقاف مؤقت.");
    }

    // ================= RESUME =================
    if (command === "!resume") {
      const serverQueue = queues.get(message.guild.id);
      if (!serverQueue) return;
      serverQueue.player.unpause();
      message.reply("▶️ رجعنا نكمل.");
    }

    // ================= LOOP =================
    if (command === "!loop") {
      const serverQueue = queues.get(message.guild.id);
      if (!serverQueue) return;
      serverQueue.loop = !serverQueue.loop;
      message.reply(serverQueue.loop ? "🔁 Loop On" : "➡️ Loop Off");
    }

  });

};

// ================= PLAY SONG FUNCTION =================
async function playSong(guildId, textChannel) {

  const serverQueue = queues.get(guildId);
  if (!serverQueue || !serverQueue.songs.length) {
    serverQueue?.connection.destroy();
    queues.delete(guildId);
    return;
  }

  const song = serverQueue.songs[0];

  const stream = await play.stream(song.url);
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });

  serverQueue.player.play(resource);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🎵 Now Playing")
    .setDescription(`**${song.title}**`);

  textChannel.send({ embeds: [embed] });

  serverQueue.player.once(AudioPlayerStatus.Idle, () => {

    if (!serverQueue.loop) {
      serverQueue.songs.shift();
    }

    playSong(guildId, textChannel);
  });
}
