/**
 * Newsletter / lead-capture transactional HTML for Resend.
 * Table layout + inline styles for broad client support; warm parenting brand palette.
 */

/** No trailing slash. Used for links and `https://…/logo.png` (see apps/web/public/logo.png). */
export function normalizedPublicSiteUrl(siteUrl: string): string {
  const t = siteUrl.trim().replace(/\/+$/, '');
  return t || 'https://www.parentingmykid.com';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Centered brand logo row — must load from absolute URL (email clients block relative paths). */
function logoHeaderRow(siteUrl: string): string {
  const base = normalizedPublicSiteUrl(siteUrl);
  const logoSrc = `${base}/logo.png`;
  return `<tr>
          <td align="center" style="padding:26px 32px 18px;background-color:#fffdf8;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center" width="94" height="94" style="width:94px;height:94px;border-radius:999px;background-color:#ffffff;border:1px solid #dce9e2;box-shadow:0 8px 22px rgba(45,106,79,0.14);">
                  <a href="${base}" target="_blank" rel="noopener noreferrer" title="ParentingMyKid" style="text-decoration:none;display:inline-block;line-height:0;">
                    <img src="${logoSrc}" width="74" alt="ParentingMyKid" border="0" style="display:block;margin:0 auto;width:74px;max-width:74px;height:74px;border:0;outline:none;border-radius:999px;-ms-interpolation-mode:bicubic;" />
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

/** Outer shell: preheader, hero, body, legal footer. `innerHtml` is trusted (our own markup). */
function emailShell(options: {
  preheader: string;
  headerTitleHtml: string;
  innerHtml: string;
  language: 'en' | 'bn';
  siteUrl: string;
}): string {
  const { preheader, headerTitleHtml, innerHtml, language, siteUrl } = options;
  const base = normalizedPublicSiteUrl(siteUrl);
  const font =
    language === 'bn'
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', 'Kalpurush', Arial, sans-serif"
      : "Georgia, 'Times New Roman', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
  const bodyFont =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', Arial, sans-serif";
  const legal =
    language === 'bn'
      ? `এই মেইলটি পেয়েছেন কারণ আপনি <a href="${base}" style="color:#2d6a4f;font-weight:600;text-decoration:underline;">parentingmykid.com</a> এ সাবস্ক্রাইব করেছেন।`
      : `You received this because you subscribed at <a href="${base}" style="color:#2d6a4f;font-weight:600;text-decoration:underline;">parentingmykid.com</a>.`;

  return `<!DOCTYPE html>
<html lang="${language === 'bn' ? 'bn' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>ParentingMyKid</title>
</head>
<body style="margin:0;padding:0;background-color:#efe8df;">
  <div style="display:none;font-size:1px;color:#efe8df;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efe8df;">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#fffdf8;border-radius:20px;overflow:hidden;border:1px solid #e8dfd4;box-shadow:0 8px 32px rgba(45,74,62,0.08);">
          ${logoHeaderRow(siteUrl)}
          <tr>
            <td style="padding:0 32px 24px;text-align:center;background-color:#fffdf8;border-bottom:1px solid #ece3d9;">
              <p style="margin:0 0 12px;font-size:12px;line-height:1;letter-spacing:1.2px;text-transform:uppercase;color:#5f7f70;font-weight:700;font-family:${bodyFont};">ParentingMyKid</p>
              <h1 style="margin:0;font-family:${font};font-size:30px;line-height:1.25;font-weight:700;color:#1f5a43;">${headerTitleHtml}</h1>
              <p style="margin:8px 0 0;font-size:18px;line-height:1;">🎉</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 36px;font-family:${bodyFont};font-size:18px;line-height:1.7;color:#2c3538;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f7f2eb;padding:22px 32px;text-align:center;font-family:${bodyFont};font-size:13px;line-height:1.65;color:#788396;border-top:1px solid #ebe3d8;">
              ${legal}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 18px;">${text}</p>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 28px;">
    <tr>
      <td align="center" style="border-radius:999px;background-color:#2d6a4f;">
        <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 36px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;font-size:17px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function buildWelcomeNewsletterEmail(
  language: 'en' | 'bn',
  name: string | undefined,
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const site = normalizedPublicSiteUrl(siteUrl);
  const rawName = name?.trim() ?? '';
  const safeHtml = rawName ? escapeHtml(rawName) : '';

  if (language === 'bn') {
    const salutationHtml = safeHtml ? `প্রিয় ${safeHtml},` : 'প্রিয় অভিভাবক,';
    const salutationText = rawName ? `প্রিয় ${rawName},` : 'প্রিয় অভিভাবক,';
    const subject = 'ParentingMyKid-এর পরিবারে আপনাকে উষ্ণ স্বাগতম! 🎉';
    const preheader =
      'সাবস্ক্রিপশনের জন্য ধন্যবাদ—শিগগিরই আমাদের প্রথম প্যারেন্টিং টিপস আপনার ইনবক্সে।';
    const headerTitle = 'আপনাকে স্বাগতম!';
    const inner = `
      ${p(`${salutationHtml}<br><br>আসসালামু আলাইকুম!`)}
      ${p(
        'ParentingMyKid-এ সাবস্ক্রাইব করার জন্য আপনাকে অসংখ্য ধন্যবাদ। সন্তানের বেড়ে ওঠার এই সুন্দর কিন্তু চ্যালেঞ্জিং যাত্রায় আপনাকে পাশে পেয়ে আমরা সত্যিই আনন্দিত।',
      )}
      ${p(
        'প্যারেন্টিং কোনো সহজ কাজ নয়, আর বাচ্চাদের সাথে কোনো ম্যানুয়ালও দেওয়া থাকে না! তবে সঠিক গাইডলাইন আর একটু সচেতনতা এই পথচলাকে করতে পারে আরও সুন্দর ও আনন্দদায়ক। এখন থেকে আমাদের ওয়েবসাইটের সবচেয়ে নতুন ও কার্যকরী প্যারেন্টিং টিপস, দারুণ সব আর্টিকেল এবং গাইডলাইন নিয়মিত পৌঁছে যাবে সরাসরি আপনার ইনবক্সে।',
      )}
      ${p(
        'আপনার সন্তানের একটি সুন্দর ভবিষ্যৎ গড়তে এবং এই প্যারেন্টিং জার্নিতে সাপোর্ট দিতে আমরা সবসময় আপনার পাশে আছি। খুব শিগগিরই আমাদের প্রথম কার্যকরী টিপসটি আপনার কাছে পৌঁছে যাবে। চোখ রাখুন আপনার ইনবক্সে!',
      )}
      ${p('ততক্ষণ পর্যন্ত আমাদের ওয়েবসাইটের অন্যান্য লেখাগুলো পড়তে নিচের বাটনে ক্লিক করুন অথবা ভিজিট করুন:')}
      ${ctaButton(site, 'ওয়েবসাইট দেখুন')}
      ${p(`<span style="font-size:16px;color:#64748b;">www.parentingmykid.com</span>`)}
      ${p('<strong style="color:#2d6a4f;font-size:19px;">হ্যাপি প্যারেন্টিং!</strong> ❤️')}
      ${p('আন্তরিক শুভেচ্ছান্তে,<br><strong>টিম ParentingMyKid</strong>')}
    `;
    const html = emailShell({
      preheader,
      headerTitleHtml: headerTitle,
      innerHtml: inner,
      language: 'bn',
      siteUrl,
    });
    const text = `${salutationText}

আসসালামু আলাইকুম!

ParentingMyKid-এ সাবস্ক্রাইব করার জন্য আপনাকে অসংখ্য ধন্যবাদ। সন্তানের বেড়ে ওঠার এই সুন্দর কিন্তু চ্যালেঞ্জিং যাত্রায় আপনাকে পাশে পেয়ে আমরা সত্যিই আনন্দিত।

প্যারেন্টিং কোনো সহজ কাজ নয়, আর বাচ্চাদের সাথে কোনো ম্যানুয়ালও দেওয়া থাকে না! তবে সঠিক গাইডলাইন আর একটু সচেতনতা এই পথচলাকে করতে পারে আরও সুন্দর ও আনন্দদায়ক। এখন থেকে আমাদের ওয়েবসাইটের সবচেয়ে নতুন ও কার্যকরী প্যারেন্টিং টিপস, দারুণ সব আর্টিকেল এবং গাইডলাইন নিয়মিত পৌঁছে যাবে সরাসরি আপনার ইনবক্সে।

আপনার সন্তানের একটি সুন্দর ভবিষ্যৎ গড়তে এবং এই প্যারেন্টিং জার্নিতে সাপোর্ট দিতে আমরা সবসময় আপনার পাশে আছি। খুব শিগগিরই আমাদের প্রথম কার্যকরী টিপসটি আপনার কাছে পৌঁছে যাবে। চোখ রাখুন আপনার ইনবক্সে!

ততক্ষণ পর্যন্ত আমাদের ওয়েবসাইটের অন্যান্য লেখাগুলো পড়তে ভিজিট করুন: www.parentingmykid.com

হ্যাপি প্যারেন্টিং! ❤️

আন্তরিক শুভেচ্ছান্তে,
টিম ParentingMyKid`;
    return { subject, html, text };
  }

  const salutationEnHtml = safeHtml ? `Dear ${safeHtml},` : 'Dear Parent,';
  const salutationEnText = rawName ? `Dear ${rawName},` : 'Dear Parent,';
  const subject = 'Welcome to the ParentingMyKid Family! 🎉';
  const preheader =
    'Thanks for subscribing—your first parenting tips will land in your inbox soon.';
  const headerTitle = 'Welcome to the family!';
  const inner = `
      ${p(`${salutationEnHtml}<br><br>Thank you so much for subscribing to ParentingMyKid. We are absolutely thrilled to welcome you to our growing community!`)}
      ${p(
        'We know that parenting is one of the most beautiful, yet challenging journeys in life. While kids don&#39;t come with an instruction manual, the right guidance, patience, and a little support can make all the difference. That is exactly why we are here.',
      )}
      ${p(
        'From now on, you will receive our latest parenting tips, expert guidelines, and insightful articles delivered straight to your inbox. We are committed to helping you nurture your child&#39;s growth with love and care.',
      )}
      ${p(
        'Keep an eye on your inbox—our first exciting update will be coming your way very soon! In the meantime, feel free to explore more resources and guides on our website:',
      )}
      ${ctaButton(site, 'Visit parentingmykid.com')}
      ${p(`<span style="font-size:16px;color:#64748b;">www.parentingmykid.com</span>`)}
      ${p('<strong style="color:#2d6a4f;font-size:19px;">Happy Parenting!</strong> ❤️')}
      ${p('Warm regards,<br><strong>Team ParentingMyKid</strong>')}
    `;
  const html = emailShell({
    preheader,
    headerTitleHtml: headerTitle,
    innerHtml: inner,
    language: 'en',
    siteUrl,
  });
  const text = `${salutationEnText}

Thank you so much for subscribing to ParentingMyKid. We are absolutely thrilled to welcome you to our growing community!

We know that parenting is one of the most beautiful, yet challenging journeys in life. While kids don't come with an instruction manual, the right guidance, patience, and a little support can make all the difference. That is exactly why we are here.

From now on, you will receive our latest parenting tips, expert guidelines, and insightful articles delivered straight to your inbox. We are committed to helping you nurture your child's growth with love and care.

Keep an eye on your inbox—our first exciting update will be coming your way very soon! In the meantime, feel free to explore more resources and guides on our website: www.parentingmykid.com

Happy Parenting! ❤️

Warm regards,
Team ParentingMyKid`;
  return { subject, html, text };
}

function emailShellCompact(options: {
  preheader: string;
  headerLabel: string;
  innerHtml: string;
  language: 'en' | 'bn';
  siteUrl: string;
}): string {
  const { preheader, headerLabel, innerHtml, language, siteUrl } = options;
  const font =
    language === 'bn'
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', Arial, sans-serif"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="${language === 'bn' ? 'bn' : 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#efe8df;">
  <div style="display:none;font-size:1px;color:#efe8df;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#efe8df;">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fffdf8;border-radius:16px;border:1px solid #e8dfd4;">
        ${logoHeaderRow(siteUrl)}
        <tr>
          <td style="background-color:#40916c;padding:22px 28px;text-align:center;">
            <p style="margin:0;font-family:${font};font-size:18px;font-weight:700;color:#ffffff;">${headerLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 36px;font-family:${font};font-size:17px;line-height:1.65;color:#2c3538;">${innerHtml}</td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;text-align:center;font-size:14px;color:#64748b;">— Team ParentingMyKid</td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildAlreadySubscribedEmail(
  language: 'en' | 'bn',
  name: string | undefined,
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const site = normalizedPublicSiteUrl(siteUrl);
  const safe = name?.trim() ? escapeHtml(name.trim()) : '';
  if (language === 'bn') {
    const subject = 'ParentingMyKid — আপনি ইতিমধ্যে আমাদের সাথে আছেন';
    const preheader = 'চিন্তা নেই—আপনি আগেই তালিকায় আছেন।';
    const inner = `${p(`আসসালামু আলাইকুম${safe ? `, ${safe}` : ''}!`)}
      ${p('এই ইমেইল ঠিকানাটি ইতিমধ্যে আমাদের তালিকায় আছে। আমরা আপনাকে নিয়মিত প্যারেন্টিং টিপস এবং আপডেট পাঠিয়ে যাব—চোখ রাখুন ইনবক্সে।')}
      ${ctaButton(site, 'ওয়েবসাইট দেখুন')}`;
    const html = emailShellCompact({
      preheader,
      headerLabel: 'আপনি আমাদের তালিকায় আছেন',
      innerHtml: inner,
      language: 'bn',
      siteUrl,
    });
    const text = `আসসালামু আলাইকুম!

এই ইমেইলটি আগেই আমাদের তালিকায় রয়েছে। আপনি আপডেট পেতে থাকবেন।

${site}`;
    return { subject, html, text };
  }
  const subject = 'ParentingMyKid — You’re already on the list';
  const preheader = 'No worries—you’re already subscribed.';
  const inner = `${p(`Hi${safe ? ` ${safe}` : ''}!`)}
    ${p('This email is already on our ParentingMyKid list. You’ll keep receiving parenting tips and updates—watch your inbox.')}
    ${ctaButton(site, 'Explore the site')}`;
  const html = emailShellCompact({
    preheader,
    headerLabel: 'You’re already subscribed',
    innerHtml: inner,
    language: 'en',
    siteUrl,
  });
  const text = `Hi!

This email is already on our list. You'll keep receiving tips and updates.

${site}`;
  return { subject, html, text };
}

export function buildFeedbackThankYouEmail(
  language: 'en' | 'bn',
  name: string | undefined,
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const site = normalizedPublicSiteUrl(siteUrl);
  const safe = name?.trim() ? escapeHtml(name.trim()) : '';
  if (language === 'bn') {
    const subject = 'ParentingMyKid — আপনার মতামত পেয়েছি, ধন্যবাদ!';
    const preheader = 'আমরা প্রতিটি বার্তা পড়ি—শীঘ্রই ফিরব।';
    const inner = `${p(`আসসালামু আলাইকুম${safe ? `, ${safe}` : ''}!`)}
      ${p('আপনার মতামত আমাদের কাছে পৌঁছেছে। আমরা প্রতিটি বার্তা মন দিয়ে পড়ি—আপনার ভাবনাগুলো ParentingMyKid-কে আরও ভালো করতে সাহায্য করে।')}
      ${ctaButton(site, 'ওয়েবসাইট দেখুন')}`;
    const html = emailShellCompact({
      preheader,
      headerLabel: 'ধন্যবাদ!',
      innerHtml: inner,
      language: 'bn',
      siteUrl,
    });
    const text = `আসসালামু আলাইকুম!

আপনার মতামত পেয়েছি। ধন্যবাদ!

${site}`;
    return { subject, html, text };
  }
  const subject = 'ParentingMyKid — We received your message';
  const preheader = 'Thanks — we read every note from parents like you.';
  const inner = `${p(`Hi${safe ? ` ${safe}` : ''}!`)}
    ${p('We’ve received your feedback. We read every message—what you share helps us make ParentingMyKid better for every family.')}
    ${ctaButton(site, 'Visit parentingmykid.com')}`;
  const html = emailShellCompact({
    preheader,
    headerLabel: 'Thank you!',
    innerHtml: inner,
    language: 'en',
    siteUrl,
  });
  const text = `Hi!

We received your feedback. Thank you!

${site}`;
  return { subject, html, text };
}
