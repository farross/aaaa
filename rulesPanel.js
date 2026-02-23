const {
  Events,
  ContainerBuilder,
  SeparatorSpacingSize,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');

const BANNER_URL = "https://cdn.discordapp.com/attachments/908838301832720394/1475579930405240983/Black_Geometric_Minimalist_Gaming_Logo_7.png?ex=699e0066&is=699caee6&hm=543e68eac0af4be63f3dc324e4f6782392a11a1ca32e09374b9483482253e1a8&";

module.exports = (client) => {

  client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;
    if (message.content !== "!setup-rules") return;

    const container = new ContainerBuilder()

      // العنوان الكبير
      .addTextDisplayComponents(text =>
        text.setContent(
`# 📜 قوانين Boostify
### يرجى قراءة القوانين بعناية قبل فتح أي طلب
`
        )
      )

      .addSeparatorComponents(sep =>
        sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )

      // القوانين
      .addTextDisplayComponents(text =>
        text.setContent(
`🔴 **1) الاحترام أولاً**
يمنع السب أو الإهانة داخل السيرفر أو داخل التذاكر.

🔴 **2) الجدية في الطلب**
أي طلب بدون نية شراء حقيقية سيتم إغلاقه فوراً.

🔴 **3) الدفع قبل التنفيذ**
لن يتم تنفيذ أي خدمة قبل تأكيد عملية الدفع.

🔴 **4) ممنوع السبام**
إرسال رسائل متكررة أو إزعاج الإدارة يعرضك للعقوبة.

🔴 **5) عدم فتح أكثر من تذكرة**
تذكرة واحدة لكل طلب فقط.

🔴 **6) الالتزام بشروط Discord**
أي مخالفة لشروط المنصة سيتم التعامل معها فوراً.
`
        )
      )

      .addSeparatorComponents(sep =>
        sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )

      // البانر الكبير
      .addMediaGalleryComponents(media =>
        media.addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_URL)
        )
      );

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

  });

};
