const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
require('dotenv').config(); // لتحميل التوكن من ملف .env

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

let orderCounter = 6; // تبدأ من 6 كما في الصورة
const orders = {};     // لتخزين بيانات الطلبات

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// أمر لإنشاء طلب جديد بالصيغة:
// !order Buried City Town hall x2 | 60 L.E | @UserMention
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!order')) {
    // الصيغة: !order <details> | <price> | <@seller>
    const args = message.content.slice(6).trim().split('|');
    if (args.length < 3) {
      return message.reply('❌ يجب استخدام الصيغة: !order تفاصيل الطلب | السعر | @بائع');
    }

    const service = args[0].trim();
    const price = args[1].trim();
    const sellerMention = args[2].trim();

    const mentionMatch = sellerMention.match(/^<@!?(\d+)>$/);
    if (!mentionMatch) {
      return message.reply('❌ الرجاء منشن البائع بطريقة صحيحة.');
    }
    const sellerId = mentionMatch[1];

    orderCounter++;

    orders[orderCounter] = {
      service,
      price,
      sellerId,
      messageId: null,
      channelId: null,
    };

    // ابحث عن القناة المناسبة لإرسال الطلب (يمكن تعديله حسب اسم القناة بالسيرفر)
    const ordersChannel = message.guild.channels.cache.find(c => c.name === 'orders' || c.name === '〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦');
    if(!ordersChannel) return message.reply('❌ لم أجد قناة orders أو 〘🤖〙𝗢𝗥𝗗𝗘𝗥𝗦 في السيرفر.');

    // بناء الايمبد
    const embed = new EmbedBuilder()
      .setColor('#8B0000')
      .setAuthor({
        name: 'BABA STORE',
        iconURL: 'https://i.imgur.com/F5smH5G.png' // شعار بافا ستور (يمكن استبداله)
      })
      .setDescription(`📦 **Order Details**`)
      .addFields(
        { name: '\u200B', value: `\`\`\`\n${service}\n\`\`\`` },
        { name: '🪙 Price:', value: price, inline: true },
        { name: '🆔 Order ID:', value: `#${orderCounter}`, inline: true },
        { name: '👤 Assigned Seller:', value: `<@${sellerId}>`, inline: true },
      )
      .setThumbnail('https://i.imgur.com/cJbSX4P.png') // صورة المنتج كما في الصورة (استبدل بالرابط المناسب)
      .setFooter({ text: '© CODE-RS' });

    // إنشاء أزرار
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order_completed_${orderCounter}`)
        .setLabel('📦 Order Completed')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`staff_access_${orderCounter}`)
        .setLabel('🔧 Staff Access')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await ordersChannel.send({ embeds: [embed], components: [buttons] });

    // تخزين بيانات الرسالة والقناة
    orders[orderCounter].messageId = msg.id;
    orders[orderCounter].channelId = msg.channel.id;

    await message.reply(`✅ تم إنشاء الطلب رقم #${orderCounter} بنجاح!`);
  }
});

// تعامل مع أزرار التفاعل
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  if (customId.startsWith('order_completed_')) {
    const orderId = customId.split('_')[2];
    const order = orders[orderId];
    if (!order) {
      return interaction.reply({ content: '❌ الطلب غير موجود.', ephemeral: true });
    }

    // حدث عند تأكيد إتمام الطلب (يمكنك إضافة اي وظيفة تريدها هنا)
    await interaction.reply({ content: `✅ تم تأكيد إتمام الطلب رقم #${orderId}`, ephemeral: true });

    // تحديث الرسالة بإزالة أزرار ( مثال لتقليل التفاعل بعد اكتمال الطلب )
    try {
      const channel = await client.channels.fetch(order.channelId);
      const msg = await channel.messages.fetch(order.messageId);

      const embed = EmbedBuilder.from(msg.embeds[0]);
      embed.setColor('#228B22'); // جعلها خضراء بعد الاكتمال
      // غير اسم الزر أو حذف الازرار بالكامل
      await msg.edit({ components: [] , embeds: [embed] });
    } catch (e) {
      console.error('Error updating message after order completed:', e);
    }

  } else if (customId.startsWith('staff_access_')) {
    const orderId = customId.split('_')[2];
    await interaction.reply({ content: `🔧 تم منح صلاحية العاملين للطلب رقم #${orderId}`, ephemeral: true });
  }
});

client.login(process.env.TOKEN);
