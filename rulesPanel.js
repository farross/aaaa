const {
  EmbedBuilder,
  Events
} = require('discord.js');

const BANNER_URL = "https://i.postimg.cc/ryjGv3JR/3.png";

module.exports = (client) => {

  client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;
    if (message.content !== "!setup-rules") return;

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("⚖️ BOOSTFIY RULES")
      .setDescription(`
> 1️⃣ Respect all members  
> 2️⃣ No spam or advertising  
> 3️⃣ No toxicity or hate speech  
> 4️⃣ Use channels correctly  
> 5️⃣ Follow Discord ToS  

━━━━━━━━━━━━━━━━━━━━━━
Please follow the rules to avoid punishment.
`)
      .setImage(BANNER_URL)
      .setFooter({ text: "Boostfiy Community • Stay Respectful" })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

  });

};
