export type TopicCard = {
  emoji: string;
  title: string;
  body: string;
  tag: string;
  gradientClass: string;
};

export type LandingContent = {
  locale: 'bn' | 'en';
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  stats: {
    v1: string;
    l1: string;
    v2: string;
    l2: string;
    v3: string;
    l3: string;
  };
  problem: {
    title: string;
    cards: { emoji: string; title: string; body: string }[];
  };
  topics: TopicCard[];
  quote: { text: string; attribution: string };
  showcase: { caption: string; linkLabel: string };
  community: { title: string; body: string; cta: string };
  footer: { tagline: string; rights: string };
};

export const bnContent: LandingContent = {
  locale: 'bn',
  hero: {
    headline: 'আপনার শিশুর সেরা ভবিষ্যৎ আপনার হাতেই',
    subheadline:
      'Parenting My Kid — বাবা-মাদের জন্য একটি উষ্ণ, বোধগম্য পথ দেখানোর জায়গা। শিশুর স্বাস্থ্য, শিক্ষা, মানসিক স্থিতিশীলতা, আবেগ, শরীর, খেলা ও বন্ধুত্ব—সবকিছু মিলিয়ে একটি সুস্থ, সুখী ভবিষ্যৎ গড়ে তুলুন।',
    cta: 'ফেসবুকে ফলো করুন',
  },
  stats: {
    v1: '১০,০০০+',
    l1: 'সচেতন বাবা-মা',
    v2: '৬টি',
    l2: 'মূল বিকাশের ক্ষেত্র',
    v3: 'প্রতিদিন',
    l3: 'নতুন ধারণা ও টিপস',
  },
  problem: {
    title: 'আজকের ব্যস্ত জীবনে শিশুর বিকাশ কি উপেক্ষিত হয়ে যাচ্ছে?',
    cards: [
      {
        emoji: '📵',
        title: 'অতিরিক্ত স্ক্রিন',
        body: 'ফোন ও ট্যাবের পিছনে সময় চলে যাওয়ায় গভীর কথা ও খেলার সময় কমে যায়।',
      },
      {
        emoji: '😟',
        title: 'আবেগীয় দূরত্ব',
        body: 'কাজের চাপে শিশুর অনুভূতি বোঝার মুহূর্তগুলো হারিয়ে যেতে পারে।',
      },
      {
        emoji: '🏃',
        title: 'খেলার অভাব',
        body: 'মানসম্মত খেলা ও একসাথে সময় কাটানো শিশুর মানসিক বিকাশে অপরিহার্য।',
      },
    ],
  },
  topics: [
    {
      emoji: '🥗',
      title: 'স্বাস্থ্য ও পুষ্টি',
      body: 'নিয়মিত খাবার, পরিষ্কার পানি ও ঘুম—শরীর ভালো থাকলে মনও ভালো থাকে। ছোট অভ্যাসেই বড় ফল।',
      tag: 'দৈনন্দিন যত্ন',
      gradientClass: 'from-[#E0FFF4] to-[#C7F9EE]',
    },
    {
      emoji: '📚',
      title: 'শিক্ষা ও মেধা বিকাশ',
      body: 'আদেশ নয়—ভাবতে শেখানো। জিজ্ঞাসা উৎসাহ দিন, ভুলকে শেখার সুযোগ বানান।',
      tag: 'চিন্তা ও শেখা',
      gradientClass: 'from-[#F3E8FF] to-[#E9D5FF]',
    },
    {
      emoji: '🧠',
      title: 'মানসিক স্থিতিশীলতা',
      body: 'চাপ, রাগ ও হতাশা স্বাভাবিক। শিশুকে নাম দিয়ে অনুভূতি বলতে শেখান—এটাই শক্তির ভিত্তি।',
      tag: 'মনের শক্তি',
      gradientClass: 'from-[#EFF6FF] to-[#DBEAFE]',
    },
    {
      emoji: '❤️',
      title: 'আবেগীয় ভারসাম্য',
      body: 'আপনার উপস্থিতি ও মনোযোগই নিরাপদ আশ্রয়। ছোট ছোট আলিঙ্গন বড় আত্মবিশ্বাস জোগায়।',
      tag: 'ভালোবাসা ও নিরাপত্তা',
      gradientClass: 'from-[#FFF7ED] to-[#FFEDD5]',
    },
    {
      emoji: '💪',
      title: 'শারীরিক বিকাশ',
      body: 'দৌড়, খেলা, বাইরের সময়—শরীর সচল থাকলে মনও সজীব থাকে।',
      tag: 'নড়াচড়া ও শক্তি',
      gradientClass: 'from-[#ECFDF5] to-[#D1FAE5]',
    },
    {
      emoji: '🎮',
      title: 'খেলাধুলা ও বন্ধুত্ব',
      body: 'বন্ধুদের সাথে খেলা শেখায় নিয়ম, ভাগ করা ও সহানুভূতি—জীবনের স্কুল।',
      tag: 'সামাজিক শেখা',
      gradientClass: 'from-[#FDF4FF] to-[#FAE8FF]',
    },
  ],
  quote: {
    text: 'একটি শিশু কীভাবে বড় হয়, তা নির্ভর করে বাবা-মা তাকে কতটুকু সময় ও ভালোবাসা দেন।',
    attribution: 'ParentingMyKid',
  },
  showcase: {
    caption: 'আমাদের ফেসবুক পেজে আরও অনুপ্রেরণা, টিপস ও গল্প পাবেন।',
    linkLabel: 'পেজ দেখুন',
  },
  community: {
    title: 'আমাদের সাথে যুক্ত হোন 💚',
    body:
      'হাজারো বাবা-মার সাথে শেয়ার করুন অভিজ্ঞতা, নতুন ধারণা পান এবং শিশুর জগতে একসাথে হাসুন।',
    cta: 'ফেসবুক পেজে যান',
  },
  footer: {
    tagline: 'শিশুর পাশে দাঁড়ান—আজ থেকেই।',
    rights: '© ParentingMyKid। সর্বস্বত্ব সংরক্ষিত।',
  },
};

export const enContent: LandingContent = {
  locale: 'en',
  hero: {
    headline: "Your Child's Best Future Starts With You",
    subheadline:
      'Parenting My Kid is a warm, clear guide for parents—health, learning, mental steadiness, emotions, body, play, and friendship—so you can build a bright, balanced life together.',
    cta: 'Follow on Facebook',
  },
  stats: {
    v1: '10000',
    l1: 'Parents inspired',
    v2: '6',
    l2: 'Core growth areas',
    v3: 'Daily',
    l3: 'Ideas & gentle tips',
  },
  problem: {
    title: "In today's busy world, is your child's growth being overlooked?",
    cards: [
      {
        emoji: '📵',
        title: 'Too much screen time',
        body: 'Hours behind phones and tablets can crowd out conversation, play, and calm connection.',
      },
      {
        emoji: '😟',
        title: 'Emotional distance',
        body: 'Work stress can quietly shrink the moments when children feel truly seen and heard.',
      },
      {
        emoji: '🏃',
        title: 'Little time for play',
        body: 'Quality play with you is not extra—it is essential for healthy mental development.',
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
      'Regular meals, water, and sleep keep body and mind steady. Small daily habits create big lifelong wins.',
      'Teach thinking, not only orders. Welcome questions and turn mistakes into lessons.',
      'Stress and big feelings are normal. Naming emotions together builds real resilience.',
      'Your steady presence is a safe home base. Small moments of attention grow deep confidence.',
      'Movement, outdoor time, and play keep energy healthy and moods brighter.',
      'Play with peers teaches sharing, rules, and empathy—the social skills that last.',
    ][i],
    tag: ['Daily care', 'Think & learn', 'Inner strength', 'Love & safety', 'Move & grow', 'Social learning'][i],
  })),
  quote: {
    text: 'How a child grows depends on the time and love their parents give them.',
    attribution: 'ParentingMyKid',
  },
  showcase: {
    caption: 'See more inspiration, tips, and stories on our Facebook page.',
    linkLabel: 'Visit the page',
  },
  community: {
    title: 'Join our parenting community 💚',
    body: 'Share wins, learn new ideas, and grow alongside thousands of parents who care deeply.',
    cta: 'Go to Facebook',
  },
  footer: {
    tagline: 'Stand beside your child—starting today.',
    rights: '© ParentingMyKid. All rights reserved.',
  },
};
