const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// الأمر الذي سترسله في الشات ليظهر رسالة الطلب
client.on('messageCreate', async message => {
    if (message.content === '!order') {
        // إنشاء embed
        const embed = new EmbedBuilder()
            .setColor('#8B0000') // اللون الأحمر الداكن
            .setAuthor({ 
                name: 'BABA STORE', 
                iconURL: 'https://i.imgur.com/your_logo.png' // استبدل بالرابط المناسب
            })
            .addFields(
                { name: '📦 Order Details', value: 'Buried City Town hall x2', inline: false },
                { name: '🪙 Price:', value: '60 L.E', inline: true },
                { name: '🆔 Order ID:', value: '#6', inline: true },
                { name: '🧑‍🚀 Assigned Seller:', value: '<@YounsUserID>', inline: true } // استبدل بالآي دي الحقيقي للبائع
            )
            .setThumbnail('https://i.imgur.com/your_product_image.png') // استبدل بالرابط المناسب لمنتج
            .setFooter({ text: '© CODE-RS' });

        // إنشاء الأزرار
        const orderButton = new ButtonBuilder()
            .setCustomId('order_completed')
            .setLabel('Order Completed')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📦');

        const staffButton = new ButtonBuilder()
            .setCustomId('staff_access')
            .setLabel('Staff Access')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔧');

        const row = new ActionRowBuilder().addComponents(orderButton, staffButton);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// التعامل مع الأزرار عند الضغط
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'order_completed') {
        await interaction.reply({ content: 'Order has been marked as completed!', ephemeral: true });
    } else if (interaction.customId === 'staff_access') {
        await interaction.reply({ content: 'Staff access granted.', ephemeral: true });
    }
});

// استبدل التوكن بتوكن بوتك
client.login('process.env.TOKEN');

