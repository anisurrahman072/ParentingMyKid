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
  /** Bengali: optional split so `scopeHighlight` can use hero accent styling */
  scopeLead?: string;
  scopeHighlight?: string;
  scopeTrail?: string;
  payoffLead: string;
  /** Gradient highlight (English) when `topicWords` is not used. Unused for Bengali when payoff block is omitted. */
  payoffAccent: string;
  payoffTrail: string;
  /** English only: topic words shown in distinct colors (e.g. nutrition … friendship). */
  topicWords?: string[];
  /** English only: plain text after the colored list. */
  topicTrail?: string;
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
      intro: 'বাবা-মা হিসেবে আপনার জন্য এক উষ্ণ, সহজবোধ্য ও বিশ্বাসযোগ্য পথপ্রদর্শক।',
      scope:
        'এখানে আপনি পাবেন ভালোবাসায় ভরা সহায়তা, কার্যকর পরামর্শ এবং সন্তানকে বড় করার প্রতিটি ধাপে পাশে থাকার আশ্বাস।',
      scopeLead: 'এখানে আপনি পাবেন ভালোবাসায় ভরা সহায়তা, কার্যকর পরামর্শ এবং সন্তানকে বড় করার ',
      scopeHighlight: 'প্রতিটি ধাপে পাশে থাকার আশ্বাস',
      scopeTrail: '।',
      payoffLead: '',
      payoffAccent: '',
      payoffTrail: '',
    },
    cta: 'ফেসবুকে ফলো করুন',
  },
  stats: {
    community: {
      headline: 'কেন এই পেজ—এক নজরে',
      supporting:
        'শিশু নিয়ে প্রশ্ন থাকলে আর একা ভাববেন না। এখানে আপনি পাবেন অন্য বাবা-মায়ের অভিজ্ঞতা, টিপস আর সাহস জোগানো গল্প—যাতে আপনি দ্রুত উপযোগী ধারণা পান এবং নিজের যাত্রাকে আরও সহজ করতে পারেন।',
      honestLine:
        'ParentingMyKid আপনার পাশে আছে, যেন প্রতিটি প্রশ্নের উত্তর খুঁজে পান ভালোবাসা আর বাস্তব অভিজ্ঞতার আলোয়।',
    },
    areas: {
      value: '৬টি গুরুত্বপূর্ণ দিক — একসাথে সাজানো',
      label:
        'আপনার সন্তানের বেড়ে ওঠার প্রতিটি ধাপে যেন কোনো গুরুত্বপূর্ণ অংশ বাদ না যায়, তাই আমরা সাজিয়েছি ৬টি মূল দিক। এখানে আপনি ধাপে ধাপে পাবেন সহায়তা—পুষ্টি, শেখা, মন, আবেগ, শরীর, আর খেলা-বন্ধুত্ব নিয়ে।',
      supporting: '',
    },
    rhythm: {
      value: 'প্রতিদিন',
      label: 'সামান্য ধারণা, বড় উপকার',
      supporting:
        'নিয়মিত পোস্ট আর টিপস আসছে ধাপে ধাপে। তাই ব্যস্ত দিনেও আপনি একটু একটু করে শিখতে পারবেন, আর সেই সামান্য ধারণাগুলোই হয়ে উঠবে বড় সহায়তা আপনার সন্তানকে বড় করার পথে।',
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
        body: 'যখন আপনি বাবা-মা হিসেবে ফোন বা ট্যাবে বেশি সময় কাটান, তখন সন্তানের সঙ্গে গল্প, খেলা আর মনোযোগের মুহূর্তগুলো কমে যায়। একইভাবে, আপনার শিশু যদি স্ক্রিনে বেশি সময় ডুবে থাকে, তবে গভীর খেলা আর কথোপকথনের জায়গা ছোট হয়ে আসে।',
      },
      {
        emoji: '😟',
        title: 'আবেগীয় দূরত্ব',
        body: 'কাজের ব্যস্ততায় যখন আপনি সন্তানের অনুভূতি বোঝার ছোট মুহূর্তগুলো মিস করেন, তখন সে ভাবতে পারে—আপনি তাকে গুরুত্ব দিচ্ছেন না, যদিও আপনি ঘরেই আছেন। Parenting My Kid মনে করিয়ে দেয়—আপনার একটুখানি মনোযোগই সন্তানের কাছে সবচেয়ে বড় আশ্বাস।',
      },
      {
        emoji: '🏃',
        title: 'খেলার অভাব',
        body: 'আপনার সঙ্গে মানসম্মত খেলা আর নিরবচ্ছিন্ন সময় কাটানোই সন্তানের মানসিক বিকাশ ও নিরাপত্তাবোধ গড়ে তোলে। এটা কখনোই শুধু স্ক্রিন বা একা খেলার বিকল্প নয়। আপনার সঙ্গে কাটানো প্রতিটি খেলাধুলার মুহূর্তই সন্তানের কাছে ভালোবাসা আর আশ্বাসের উৎস।',
      },
    ],
  },
  topics: [
    {
      emoji: '🥗',
      title: 'স্বাস্থ্য ও পুষ্টি',
      body: 'আপনার সন্তানের শরীর ও মনের জন্য খাবার, পানি আর ঘুম হলো সবচেয়ে জরুরি জ্বালানি। আজ আপনি যদি তাকে সঠিক খাবার দেন, পর্যাপ্ত পানি পান করান আর নিয়মিত ঘুমের অভ্যাস গড়ে তোলেন, তাহলে আগামী দিনে তার মনোযোগ, শান্তি আর সুস্থতা আরও বাড়বে।',
      tag: 'দৈনন্দিন যত্ন',
      gradientClass:
        'bg-gradient-to-br from-teal-100/95 via-emerald-50/90 to-cyan-100/85 border border-teal-200/55 shadow-[0_22px_56px_-20px_rgba(13,148,136,0.28)] ring-1 ring-white/70 backdrop-blur-none sm:backdrop-blur-[2px]',
    },
    {
      emoji: '📚',
      title: 'শিক্ষা ও মেধা বিকাশ',
      body: 'আপনার সন্তানের প্রশ্ন আর কৌতূহলকে স্বাগত জানান—এটাই তার শেখার আসল শক্তি। আজ সে যে প্রশ্ন করছে, সেটিই আগামী দিনের আত্মবিশ্বাস গড়ে তোলে। পড়ার জন্য চাপ না দিয়ে তাকে উৎসাহ দিন নিজের মতো করে জানতে, ভাবতে আর শিখতে।',
      tag: 'চিন্তা ও শেখা',
      gradientClass:
        'bg-gradient-to-br from-violet-100/95 via-purple-50/90 to-fuchsia-100/80 border border-violet-200/50 shadow-[0_22px_56px_-20px_rgba(124,58,237,0.22)] ring-1 ring-white/70 backdrop-blur-none sm:backdrop-blur-[2px]',
    },
    {
      emoji: '🧠',
      title: 'মানসিক স্থিতিশীলতা',
      body: 'শিশুকে তার রাগ, দুঃখ বা ভয় চিনে নাম বলতে শেখান। এতে সে বুঝতে পারে তার ভেতরে কী চলছে, বিভ্রান্ত হয় না এবং ধীরে ধীরে শান্ত থাকতে শেখে। যেমন, সন্তান রেগে গেলে তাকে বলুন—“তুমি কি একটু বিরক্ত বোধ করছো?”। এতে সে নিজের আবেগ চিনতে শিখবে এবং ধীরে ধীরে শান্ত থাকার অভ্যাস গড়ে তুলবে।',
      tag: 'মনের শক্তি',
      gradientClass:
        'bg-gradient-to-br from-sky-100/95 via-blue-50/90 to-indigo-100/82 border border-sky-200/50 shadow-[0_22px_56px_-20px_rgba(14,165,233,0.22)] ring-1 ring-white/70 backdrop-blur-none sm:backdrop-blur-[2px]',
    },
    {
      emoji: '❤️',
      title: 'আবেগীয় ভারসাম্য',
      body: 'শিশু তার আবেগকে নিরাপদ মনে করে তখনই, যখন তার বাবা-মা মনোযোগ দিয়ে তার কথা শোনেন আর স্নেহ দেখান। এতে সে নিজেকে এবং তার বাবা-মাকে ভালোবাসতে শেখে এবং সম্পর্কের প্রতি বিশ্বাস গড়ে তোলে।',
      tag: 'ভালোবাসা ও নিরাপত্তা',
      gradientClass:
        'bg-gradient-to-br from-orange-100/95 via-amber-50/90 to-rose-100/80 border border-orange-200/50 shadow-[0_22px_56px_-20px_rgba(234,88,12,0.18)] ring-1 ring-white/70 backdrop-blur-none sm:backdrop-blur-[2px]',
    },
    {
      emoji: '💪',
      title: 'শারীরিক বিকাশ',
      body: 'নিয়মিত নড়াচড়া ও বাইরে সময় কাটানো শিশুর শরীরকে শক্ত রাখে, মেজাজকে সতেজ করে এবং তার পূর্ণ বিকাশে সাহায্য করে। খোলা আকাশের নিচে খেলাধুলা বা হাঁটা শুধু তাকে সক্রিয় ও আনন্দময় করে না, রোদে থাকার মাধ্যমে সে ভিটামিন ডি পায় যা হাড়কে মজবুত করে এবং আত্মবিশ্বাস বাড়ায়।',
      tag: 'নড়াচড়া ও শক্তি',
      gradientClass:
        'bg-gradient-to-br from-emerald-100/95 via-green-50/90 to-lime-100/78 border border-emerald-200/50 shadow-[0_22px_56px_-20px_rgba(5,150,105,0.24)] ring-1 ring-white/70 backdrop-blur-none sm:backdrop-blur-[2px]',
    },
    {
      emoji: '🎮',
      title: 'খেলাধুলা ও বন্ধুত্ব',
      body: 'বন্ধুদের সঙ্গে খেলায় শিশু নিয়ম মানতে শেখে, জিনিস ভাগাভাগি করতে শিখে এবং অন্যের অনুভূতি বুঝে সহানুভূতিশীল হয়। এসব অভ্যাস তাকে শুধু স্কুলে নয়, জীবনের প্রতিটি ধাপে সামাজিকভাবে দক্ষ ও আত্মবিশ্বাসী করে তোলে।',
      tag: 'সামাজিক শেখা',
      gradientClass:
        'bg-gradient-to-br from-fuchsia-100/95 via-pink-50/90 to-purple-100/82 border border-fuchsia-200/45 shadow-[0_22px_56px_-20px_rgba(192,38,211,0.2)] ring-1 ring-white/70 backdrop-blur-none sm:backdrop-blur-[2px]',
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
    '“হাই! একসাথে পড়ুন—আমি পাশে আছি। নিচে স্ক্রল করুন, আমি আপনার সাথে এগিয়ে যাব। 💛”',
    '“আপনি একা নন—এই যাত্রায় আরও অনেক বাবা-মা আপনার মতো শিখছেন।”',
    '“কখনো কখনো শুধু মনোযোগ চাই… ঘড়ির টিকটিক নয়।”',
    '“স্বাস্থ্য, মন আর খেলা—আজ রাতে একটি নিয়ে কথা বলি?”',
    'দ্বীনি শিক্ষা—মা-বাবার প্রথম দায়িত্ব। আপনার সন্তানকে দ্বীনি শিক্ষায় বড় করুন!',
    '“শিশুদের নিয়ে এই ভাবনা আমাদের দায়িত্ব মনে করিয়ে দেয়।”',
    '“প্রতিদিনের টিপস, আপনার হাতের নাগালে।”',
    'কমিউনিটিতে সবাইকে হাই বলা যায়? প্লিজ?',
    'আজ পাশে থাকার জন্য ধন্যবাদ। তোমাকে ভালোবাসি। 🤗',
  ],
};

export const enContent: LandingContent = {
  locale: 'en',
  hero: {
    headline: "Your Child's Best Future Is in Your Hands",
    subheadline: {
      brand: 'Parenting My Kid',
      intro:
        'A trusted, easy guide for parents. Find support, tips, and reassurance in every step—',
      scope: '',
      payoffLead: '',
      payoffAccent: '',
      payoffTrail: '',
      topicWords: ['nutrition', 'learning', 'feelings', 'play', 'friendship'],
      topicTrail: ', all on one gentle path.',
    },
    cta: 'Follow on Facebook',
  },
  stats: {
    community: {
      headline: 'Why this page—at a glance',
      supporting:
        'If you have questions about your child, you do not need to feel alone. Here you will find other parents’ experience, tips, and courage-building stories—so you get practical ideas quickly and your journey feels a little easier.',
      honestLine:
        'ParentingMyKid stays beside you—so you can find answers to every question in love and real parent experience.',
    },
    areas: {
      value: '6 important areas—organized together',
      label:
        'So that no important part is missed at any step of your child’s growth, we’ve organized six core areas. Here you will find step-by-step support—for nutrition, learning, mind, emotions, body, and play & friendship.',
      supporting: '',
    },
    rhythm: {
      value: 'Daily',
      label: 'Small ideas, big help',
      supporting:
        'Regular posts and tips come step by step—so even on busy days you can learn bit by bit, and those small ideas turn into real support on the path to raising your child.',
    },
  },
  problem: {
    title: "In today's busy life, is your child's growth getting overlooked?",
    mascotBubble: 'Everyone is so busy… does anyone really notice me?',
    mascotBubbleFollowup: 'Will you talk with me for a bit? I am waiting…',
    cards: [
      {
        emoji: '📵',
        title: 'Too much screen time',
        body: 'When parents spend long stretches on a phone or tablet, there is less room for stories, play, and full attention with a child. When a child is glued to screens too, deep play and real conversation shrink.',
      },
      {
        emoji: '😟',
        title: 'Emotional distance',
        body: 'On a packed day it is easy to miss tiny moments to read a child’s feelings—they may think you do not care, even if you are in the same room. Parenting My Kid reminds us: even a little attention is the biggest reassurance.',
      },
      {
        emoji: '🏃',
        title: 'Not enough real play',
        body: 'Quality play and uninterrupted time with you builds their mind and sense of safety—it is not something screens or playing alone fully replace. Each playful moment with you is a well of love and reassurance.',
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
      'Physical growth',
      'Play & friendship',
    ][i],
    body: [
      'Food, water, and sleep are the fuel your child’s body and mind run on. When you offer nourishing food today, enough water, and steady sleep habits, tomorrow brings more focus, calm, and wellness.',
      'Welcome their questions and curiosity—that is the real engine of learning. The questions they ask today build tomorrow’s confidence. Encourage them to learn in their own way, without pressure to perform.',
      'Teach them words for anger, sadness, or fear so they can name what is happening inside, feel less lost, and slowly learn calm. For example, if they are upset, try: “Are you feeling a little frustrated?”—so they recognize feelings and build steadiness over time.',
      'Children feel safer with their feelings when you listen with care and show affection. That is how they learn to love themselves and you—and to trust relationships.',
      'Regular movement and time outdoors keep the body strong, lift mood, and support whole growth. Play and walks under the open sky bring energy and joy—and sunlight helps vitamin D for strong bones and growing confidence.',
      'Play with friends teaches sharing, rules, and tuning in to how others feel. Those habits help at school—and in life.',
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
        text: 'How a child grows depends on how much time and love their parents give them.',
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
    caption: 'On our Facebook page you will find more inspiration, tips, and parent stories.',
    linkLabel: 'Visit the page',
  },
  community: {
    title: 'Join us 💚',
    body: 'Share with thousands of parents, pick up fresh ideas, and laugh together in your child’s world.',
    cta: 'Go to Facebook',
  },
  footer: {
    tagline: 'Stand beside your child—starting today.',
    rights: '© ParentingMyKid. All rights reserved.',
    privacyLabel: 'Privacy Policy',
  },
  scrollCompanion: [
    'Hi! Let’s read together—I’m right beside you. Scroll down and I’ll come with you. 💛',
    'You are not alone—many parents like you are learning on this journey.',
    'Sometimes I just need attention… not the ticking clock.',
    'Health, mind, and play—which one can we talk about tonight?',
    'Thinking about children this way reminds us what we owe them—our care.',
    'Every day’s tips, within easy reach.',
    'Can we say hi to everyone in the community? Please?',
    'Thanks for being here today. Love you. 🤗',
  ],
};
