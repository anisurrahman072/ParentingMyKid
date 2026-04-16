export type TopicCard = {
  emoji: string;
  title: string;
  body: string;
  tag: string;
  gradientClass: string;
};

/** Hero subhead: split for typography hierarchy without extra vertical space */
export type HeroSubheadline = {
  brand: string;
  intro: string;
  scope: string;
  payoffLead: string;
  payoffAccent: string;
  payoffTrail: string;
};

/** Deep gradient family for the quote card — each slide picks one for a premium, varied feel */
export type QuoteCardPalette =
  | 'obsidian-teal'
  | 'nocturne-violet'
  | 'midnight-indigo'
  | 'deep-sequoia'
  | 'velvet-plum';

/** One slide in the landing quote carousel */
export type QuoteSlide = {
  text: string;
  /** Person or organization credited */
  author: string;
  /** Role, era, or source — shown under the name */
  creditLine?: string;
  /** Site-original voice vs. cited quotation */
  kind: 'brand' | 'citation';
  palette: QuoteCardPalette;
};

export type LandingContent = {
  locale: 'bn' | 'en';
  hero: {
    headline: string;
    subheadline: HeroSubheadline;
    cta: string;
  };
  stats: {
    /** First column: human, non-numeric “community” framing (no fake metrics) */
    community: {
      headline: string;
      supporting: string;
      honestLine: string;
    };
    areas: { value: string; label: string; supporting: string };
    rhythm: { value: string; label: string; supporting: string };
  };
  problem: {
    title: string;
    /** Short thought-bubble line by the upset kid mascot (lonely / confused tone) */
    mascotBubble: string;
    /** Second thought-bubble line that appears after a few seconds. */
    mascotBubbleFollowup: string;
    cards: { emoji: string; title: string; body: string }[];
  };
  topics: TopicCard[];
  quote: {
    /** Microcopy above the author line (e.g. “Who said this”) */
    attributionPrompt: string;
    slides: QuoteSlide[];
  };
  showcase: {
    caption: string;
    linkLabel: string;
    /** Optional gallery (e.g. BN: three banners). When absent, landing uses the default two-card stack. */
    gallery?: { src: string; alt: string }[];
  };
  community: { title: string; body: string; cta: string };
  footer: { tagline: string; rights: string; privacyLabel: string };
  /** Scroll-linked kid companion: one line per `[data-scroll-chapter]` block in order. */
  scrollCompanion: string[];
};

export const bnContent: LandingContent = {
  locale: 'bn',
  hero: {
    headline: 'আপনার শিশুর সেরা ভবিষ্যৎ আপনার হাতেই',
    subheadline: {
      brand: 'Parenting My Kid',
      intro: 'বাবা-মাদের জন্য একটি উষ্ণ, বোধগম্য পথ দেখানোর জায়গা।',
      scope: 'শিশুর স্বাস্থ্য · শিক্ষা · মানসিক স্থিতিশীলতা · আবেগ · শরীর · খেলা ও বন্ধুত্ব—সবকিছু',
      payoffLead: 'মিলিয়ে ',
      payoffAccent: 'একটি সুস্থ, সুখী ভবিষ্যৎ',
      payoffTrail: ' গড়ে তুলুন।',
    },
    cta: 'ফেসবুকে ফলো করুন',
  },
  stats: {
    community: {
      headline: 'কেন এই পেজ—এক নজরে',
      supporting:
        'শিশু নিয়ে প্রশ্ন থাকলে আর একা ভাববেন না। এখানে বাবা-মারা নিজের অভিজ্ঞতা, টিপস ও সাহস জোগানোর গল্প ভাগ করে—যাতে আপনি দ্রুত উপযোগী ধারণা পান।',
      honestLine: 'ভুয়া “ফলোয়ার সংখ্যা” নয়—আসল মানুষের কথোপকথন; আপনিও যুক্ত হতে পারেন।',
    },
    areas: {
      value: '৬টি',
      label: 'গুরুত্বপূর্ণ দিক—একসাথে সাজানো',
      supporting:
        'পুষ্টি, শেখা, মন, আবেগ, শরীর, খেলা-বন্ধুত্ব—নিচের বিষয়গুলোতে ধাপে ধাপে সাহায্য, যাতে কোনো গুরুত্বপূর্ণ অংশ মিস না হয়।',
    },
    rhythm: {
      value: 'প্রতিদিন',
      label: 'সামান্য ধারণা, বড় উপকার',
      supporting:
        'পোস্ট ও টিপস নিয়মিত আসে—বেশি সময় নয়, শুধু একটু একটু করে শেখা; ব্যস্ত দিনেও কাজে লাগবে।',
    },
  },
  problem: {
    title: 'আজকের ব্যস্ত জীবনে শিশুর বিকাশ কি উপেক্ষিত হয়ে যাচ্ছে?',
    mascotBubble: 'সবাই এত ব্যস্ত… কেউ কি আমাকে খেয়াল করে?',
    mascotBubbleFollowup: 'আমার সাথে একটু কথা বলবে? আমি অপেক্ষা করছি…',
    cards: [
      {
        emoji: '📵',
        title: 'অতিরিক্ত স্ক্রিন',
        body:
          'যখন আমরা বাবা-মা ফোন বা ট্যাবে বেশি মগ্ন থাকি, শিশুর সঙ্গে গল্প, খেলা ও মনোযোগের সময় কমে যায়। শিশু নিজেও স্ক্রিনে বেশি সময় দিলে গভীর খেলা ও কথার জায়গা আরও ছোট হয়ে আসে।',
      },
      {
        emoji: '😟',
        title: 'আবেগীয় দূরত্ব',
        body:
          'কাজ ও ব্যস্ততায় যখন শিশুর অনুভূতি বোঝার ছোট মুহূর্তগুলো মিস হয়ে যায়, শিশু ভাবতে পারে সে যথেষ্ট গুরুত্ব পাচ্ছে না—যদিও আমরা ঘরেই আছি।',
      },
      {
        emoji: '🏃',
        title: 'খেলার অভাব',
        body:
          'বাবা-মার সঙ্গে মানসম্মত খেলা ও নিরবচ্ছিন্ন একসাথে সময় শিশুর মানসিক বিকাশ ও নিরাপত্তাবোধ গড়ে—এটা শুধু স্ক্রিন বা একা খেলার বিকল্প নয়।',
      },
    ],
  },
  topics: [
    {
      emoji: '🥗',
      title: 'স্বাস্থ্য ও পুষ্টি',
      body: 'খাবার, পানি ও ঘুম শিশুর শরীর ও মনের জ্বালানি—আজকের ছোট যত্নই কালকের মনোযোগ ও শান্তি বাড়ায়।',
      tag: 'দৈনন্দিন যত্ন',
      gradientClass:
        'bg-gradient-to-br from-teal-100/95 via-emerald-50/90 to-cyan-100/85 border border-teal-200/55 shadow-[0_22px_56px_-20px_rgba(13,148,136,0.28)] ring-1 ring-white/70 backdrop-blur-[2px]',
    },
    {
      emoji: '📚',
      title: 'শিক্ষা ও মেধা বিকাশ',
      body: 'জিজ্ঞাসা ও ভাবনাকে স্বাগত জানালে শেখা টিকে—আজকের প্রশ্নই আগামীর আত্মবিশ্বাস গড়ে।',
      tag: 'চিন্তা ও শেখা',
      gradientClass:
        'bg-gradient-to-br from-violet-100/95 via-purple-50/90 to-fuchsia-100/80 border border-violet-200/50 shadow-[0_22px_56px_-20px_rgba(124,58,237,0.22)] ring-1 ring-white/70 backdrop-blur-[2px]',
    },
    {
      emoji: '🧠',
      title: 'মানসিক স্থিতিশীলতা',
      body: 'চাপ বা রাগের নাম ধরে বললে ভেতরের শান্তি শেখে—আজকের ছোট সাহস, কালকের মানসিক শক্তি।',
      tag: 'মনের শক্তি',
      gradientClass:
        'bg-gradient-to-br from-sky-100/95 via-blue-50/90 to-indigo-100/82 border border-sky-200/50 shadow-[0_22px_56px_-20px_rgba(14,165,233,0.22)] ring-1 ring-white/70 backdrop-blur-[2px]',
    },
    {
      emoji: '❤️',
      title: 'আবেগীয় ভারসাম্য',
      body: 'আপনার মনোযোগ ও স্নেহ শিশুকে শেখায়—অনুভূতি নিরাপদ, নিজেকে ভালোবাসা ও সম্পর্কে বিশ্বাস গড়ে।',
      tag: 'ভালোবাসা ও নিরাপত্তা',
      gradientClass:
        'bg-gradient-to-br from-orange-100/95 via-amber-50/90 to-rose-100/80 border border-orange-200/50 shadow-[0_22px_56px_-20px_rgba(234,88,12,0.18)] ring-1 ring-white/70 backdrop-blur-[2px]',
    },
    {
      emoji: '💪',
      title: 'শারীরিক বিকাশ',
      body: 'নড়াচড়া ও বাইরের সময় শরীর ও মেজাজ দুটোই সতেজ রাখে—সম্পূর্ণ বিকাশের অংশ।',
      tag: 'নড়াচড়া ও শক্তি',
      gradientClass:
        'bg-gradient-to-br from-emerald-100/95 via-green-50/90 to-lime-100/78 border border-emerald-200/50 shadow-[0_22px_56px_-20px_rgba(5,150,105,0.24)] ring-1 ring-white/70 backdrop-blur-[2px]',
    },
    {
      emoji: '🎮',
      title: 'খেলাধুলা ও বন্ধুত্ব',
      body: 'বন্ধুদের সঙ্গে খেলায় নিয়ম, ভাগ করা ও সহানুভূতি শেখে—স্কুল ও জীবনের সামাজিক দক্ষতা।',
      tag: 'সামাজিক শেখা',
      gradientClass:
        'bg-gradient-to-br from-fuchsia-100/95 via-pink-50/90 to-purple-100/82 border border-fuchsia-200/45 shadow-[0_22px_56px_-20px_rgba(192,38,211,0.2)] ring-1 ring-white/70 backdrop-blur-[2px]',
    },
  ],
  quote: {
    attributionPrompt: 'কে বলেছিলেন',
    slides: [
      {
        kind: 'brand',
        palette: 'obsidian-teal',
        text: 'একটি শিশু কীভাবে বড় হয়, তা নির্ভর করে বাবা-মা তাকে কতটুকু সময় ও ভালোবাসা দেন।',
        author: 'ParentingMyKid',
        creditLine: 'আমাদের সম্প্রদায়ের ভাষ্য',
      },
      {
        kind: 'citation',
        palette: 'nocturne-violet',
        text: 'প্রাথমিক শৈশবের শিক্ষার উদ্দেশ্য হওয়া উচিত—শিশুর নিজের শেখার স্বাভাবিক আকাঙ্ক্ষাকে জাগিয়ে তোলা।',
        author: 'মারিয়া মন্টেসরি',
        creditLine: 'শিক্ষাবিদ ও চিকিৎসক · ইতালি · ১৮৭০–১৯৫২',
      },
      {
        kind: 'citation',
        palette: 'midnight-indigo',
        text: 'যিনি শিশুর জীবনে সাহায্য করার জন্য কিছু করেন—আমার কাছে তিনি একজন নায়ক।',
        author: 'ফ্রেড রজার্স',
        creditLine: 'শিক্ষাবিদ ও সম্প্রচারক · মিস্টার রজার্স’ নেবারহুড',
      },
      {
        kind: 'citation',
        palette: 'deep-sequoia',
        text: 'আমরা যেভাবে আমাদের শিশুদের সঙ্গে কথা বলি—সেটাই তাদের অন্তর্মুখী কণ্ঠ হয়ে ওঠে।',
        author: 'পেগি ও’মারা',
        creditLine: 'সম্পাদক ও লেখক · মাদারিং · যুক্তরাষ্ট্র',
      },
      {
        kind: 'citation',
        palette: 'velvet-plum',
        text: 'শিশুরা বড়দের কথা ভালো শোনে না, কিন্তু বড়দের অনুকরণ করতে কখনো ব্যর্থ হয় না।',
        author: 'জেমস বল্ডউইন',
        creditLine: 'লেখক ও সমাজ সমালোচক · যুক্তরাষ্ট্র · ১৯২৪–১৯৮৭',
      },
    ],
  },
  showcase: {
    caption: 'আমাদের ফেসবুক পেজে আরও অনুপ্রেরণা, টিপস ও গল্প পাবেন।',
    linkLabel: 'পেজ দেখুন',
    gallery: [
      {
        src: '/banner-1.png',
        alt: 'বাবা ও শিশু—ভাবতে শেখানো, ব্লক খেলা ও চিন্তার চিত্রকল্প',
      },
      {
        src: '/banner-2.png',
        alt: 'পরিবার ও শিশু—একসাথে খেলা ও শেখার মুহূর্ত',
      },
      {
        src: '/banner-3-bn.png',
        alt: 'শিশুর আবেগকে গুরুত্ব দিন—বাবা ও সন্তানের সান্ত্বনার দৃশ্য',
      },
    ],
  },
  community: {
    title: 'আমাদের সাথে যুক্ত হোন 💚',
    body: 'হাজারো বাবা-মার সাথে শেয়ার করুন অভিজ্ঞতা, নতুন ধারণা পান এবং শিশুর জগতে একসাথে হাসুন।',
    cta: 'ফেসবুক পেজে যান',
  },
  footer: {
    tagline: 'শিশুর পাশে দাঁড়ান—আজ থেকেই।',
    rights: '© ParentingMyKid। সর্বস্বত্ব সংরক্ষিত।',
    privacyLabel: 'গোপনীয়তা নীতি',
  },
  scrollCompanion: [
    'হাই! একসাথে পড়ো—আমি পাশে আছি। নিচে স্ক্রল করো, আমি হেঁটে যাব। 💛',
    'এত বাবা-মা একসাথে শিখছেন—তুমিও এই যাত্রায় একা নও।',
    'কখনো কখনো শুধু মনোযোগ চাই… শুধু ঘড়ির টিকটিক নয়।',
    'স্বাস্থ্য, মন, খেলা—আজ রাতে একটা নিয়ে আলাপ করব?',
    'এই বাণীটা শুনে মন ভরে গেল। একটু পরে কথা বলব?',
    'ছবি! একসাথে গল্পগুলো দেখতে চাই।',
    'কমিউনিটিতে সবাইকে হাই বলা যায়? প্লিজ?',
    'আজ পাশে থাকার জন্য ধন্যবাদ। তোমাকে ভালোবাসি। 🤗',
  ],
};

export const enContent: LandingContent = {
  locale: 'en',
  hero: {
    headline: "Your Child's Best Future Starts With You",
    subheadline: {
      brand: 'Parenting My Kid',
      intro: 'A warm, clear companion for parents—rooted in empathy, not noise.',
      scope:
        'Health · learning · steadiness · feelings · body · play · friendship—in one gentle flow.',
      payoffLead: 'Build a ',
      payoffAccent: 'bright, balanced future',
      payoffTrail: '—together.',
    },
    cta: 'Follow on Facebook',
  },
  stats: {
    community: {
      headline: "Why you're here",
      supporting:
        'Questions about your child shouldn’t feel lonely. Parents share real stories, tips, and encouragement on our Facebook page—so you leave with ideas you can use today.',
      honestLine: 'No vanity metrics—just honest conversation you can join.',
    },
    areas: {
      value: '6',
      label: 'Big life areas, one gentle map',
      supporting:
        'Health, learning, mind, feelings, body, play & friendship—so nothing important slips through the cracks.',
    },
    rhythm: {
      value: 'Daily',
      label: 'Small ideas. Steady support.',
      supporting:
        'Fresh posts and tips show up often—quick reads for busy days, not another long to-do list.',
    },
  },
  problem: {
    title: "In today's busy world, is your child's growth being overlooked?",
    mascotBubble: "Everyone's so busy… does anyone really see me?",
    mascotBubbleFollowup: 'Will you sit with me for a minute? I miss you.',
    cards: [
      {
        emoji: '📵',
        title: 'Too much screen time',
        body:
          'When parents stay glued to phones and tablets, there is less real talk, play, and attention for the child. When the child is over-screened too, deep play and conversation get squeezed.',
      },
      {
        emoji: '😟',
        title: 'Emotional distance',
        body:
          'Under work pressure or a packed day, we can miss small moments to read a child’s feelings—and they may feel unimportant even when we are in the same home.',
      },
      {
        emoji: '🏃',
        title: 'Little time for play',
        body:
          'Quality play and uninterrupted time with you builds a child’s mind and sense of safety—it is not something screens or solo play fully replace.',
      },
    ],
  },
  topics: bnContent.topics.map((t, i) => ({
    ...t,
    title: [
      'Health & nutrition',
      'Education & learning',
      'Mental stability',
      'Emotional balance',
      'Physical activity',
      'Play & friendship',
    ][i],
    body: [
      'Food, water, and sleep quietly fuel growth—small routines today lift your child’s energy, focus, and calm tomorrow.',
      'When curiosity is welcome, learning sticks—questions now plant confidence for school and life ahead.',
      'Naming stress and big feelings together builds inner steadiness—less overwhelm, more courage to cope.',
      'Your warmth and attention teach that feelings are safe—roots for self-worth and how they connect with others.',
      'Movement and outdoor play strengthen body and mood—energy and joy that support whole-child growth.',
      'Peer play grows empathy, rules, and belonging—the social muscles life will keep asking for.',
    ][i],
    tag: [
      'Daily care',
      'Think & learn',
      'Inner strength',
      'Love & safety',
      'Move & grow',
      'Social learning',
    ][i],
  })),
  quote: {
    attributionPrompt: 'Who said this',
    slides: [
      {
        kind: 'brand',
        palette: 'obsidian-teal',
        text: 'How a child grows depends on the time and love their parents give them.',
        author: 'ParentingMyKid',
        creditLine: 'From our community',
      },
      {
        kind: 'citation',
        palette: 'nocturne-violet',
        text: 'The goal of early childhood education should be to activate the child’s own natural desire to learn.',
        author: 'Maria Montessori',
        creditLine: 'Educator & physician · Italy · 1870–1952',
      },
      {
        kind: 'citation',
        palette: 'midnight-indigo',
        text: 'Anyone who does anything to help a child in their life is a hero to me.',
        author: 'Fred Rogers',
        creditLine: 'Educator & broadcaster · Mister Rogers’ Neighborhood',
      },
      {
        kind: 'citation',
        palette: 'deep-sequoia',
        text: 'The way we talk to our children becomes their inner voice.',
        author: 'Peggy O’Mara',
        creditLine: 'Editor & writer · Mothering · United States',
      },
      {
        kind: 'citation',
        palette: 'velvet-plum',
        text: 'Children have never been very good at listening to their elders, but they have never failed to imitate them.',
        author: 'James Baldwin',
        creditLine: 'Writer & social critic · United States · 1924–1987',
      },
    ],
  },
  showcase: {
    caption: 'See more inspiration, tips, and stories on our Facebook page.',
    linkLabel: 'Visit the page',
  },
  community: {
    title: 'Join our parenting community 💚',
    body: 'Share wins, learn new ideas, and grow alongside parents who care deeply.',
    cta: 'Go to Facebook',
  },
  footer: {
    tagline: 'Stand beside your child—starting today.',
    rights: '© ParentingMyKid. All rights reserved.',
    privacyLabel: 'Privacy Policy',
  },
  scrollCompanion: [
    "Hi! I'm with you while you read—scroll down and I'll tag along. 💛",
    'So many parents are learning together here—you’re not on your own.',
    'Sometimes I just need you to notice me… not only the schedule.',
    'Health, feelings, play—which one can we talk about tonight?',
    'That line filled my heart. Can we chat about it later?',
    'Pictures! I want to see the stories with you.',
    'Can we say hi to everyone in the community? Pleeeaase?',
    'Thanks for staying with me today. Love you. 🤗',
  ],
};
