'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

import type { LandingContent } from '@/lib/content';
import { useCoarsePointer } from '@/lib/use-coarse-pointer';

import { HappyKidPillarMascot } from './HappyKidPillarMascot';
import { PillarCardStarBorder } from './PillarCardStarBorder';
import { ScrollReveal } from './ScrollReveal';

type Props = {
  content: LandingContent;
};

/** Bangla health pillar — phrase to emphasize (must match `content.ts`). */
const BN_HEALTH_SLEEP_HABIT_PHRASE = 'নিয়মিত ঘুমের অভ্যাস';

/** Bangla education pillar — trailing line gets a soft solid accent (not gradient). */
const BN_EDUCATION_BODY_ACCENT =
  'পড়ার জন্য চাপ না দিয়ে তাকে উৎসাহ দিন নিজের মতো করে জানতে, ভাবতে আর শিখতে।';

/** Bangla mental-stability example quote — must match `content.ts` exactly (curly quotes). */
const BN_MENTAL_QUOTE_ACCENT = '“তুমি কি একটু বিরক্ত বোধ করছো?”';

/** Bangla emotional-balance pillar — phrase to emphasize (must match `content.ts`). */
const BN_EMOTIONAL_LOVE_PHRASE = 'তার বাবা-মাকে ভালোবাসতে শেখে';

/** Bangla physical pillar — sun / vitamin D clause (must match `content.ts`). */
const BN_PHYSICAL_SUN_VITAMIN_PHRASE = 'রোদে থাকার মাধ্যমে সে ভিটামিন ডি পায় যা হাড়কে মজবুত করে';

/** Bangla play & friendship pillar — phrase to emphasize (must match `content.ts`). */
const BN_PLAY_SOCIAL_CONFIDENCE_PHRASE = 'সামাজিকভাবে দক্ষ ও আত্মবিশ্বাসী';

/** English pillar accents — substrings of `enContent.topics[].body` (must match exactly). */
const EN_HEALTH_SLEEP_HABIT_PHRASE = 'steady sleep habits';

const EN_EDUCATION_BODY_ACCENT =
  'Encourage them to learn in their own way, without pressure to perform.';

/** Must match `enContent` body — typographic quotes around the example question. */
const EN_MENTAL_QUOTE_ACCENT = '\u201CAre you feeling a little frustrated?\u201D';

const EN_EMOTIONAL_LOVE_PHRASE = 'learn to love themselves and you';

const EN_PHYSICAL_SUN_VITAMIN_PHRASE =
  'sunlight helps vitamin D for strong bones and growing confidence';

/** Em dash before “and”, same as in `content.ts`. */
const EN_PLAY_SOCIAL_OUTCOME_PHRASE = 'Those habits help at school\u2014and in life.';

/** Degrees — mix of “top-right lean” vs “bottom-left” for an organic bento */
const CARD_TILTS = [2.4, -2.8, 2.6, -2.1, 2.2, -2.5] as const;

/** Deep gradient text per pillar — premium title treatment */
const PILLAR_TITLE_GRADIENT = [
  'bg-gradient-to-br from-teal-900 via-emerald-800 to-cyan-900',
  'bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-900',
  'bg-gradient-to-br from-sky-900 via-blue-800 to-indigo-900',
  'bg-gradient-to-br from-orange-800 via-rose-700 to-amber-900',
  'bg-gradient-to-br from-emerald-900 via-teal-800 to-green-900',
  'bg-gradient-to-br from-fuchsia-900 via-pink-800 to-purple-900',
] as const;

/**
 * Card faces: light tints in the same hue families as `PILLAR_TITLE_GRADIENT`.
 * `via-white` lifts each card off the section’s mint/violet wash (`bg-soft`) so edges stay visible.
 */
const PILLAR_CARD_CLASS = [
  'border-2 border-teal-300/85 bg-gradient-to-br from-teal-100 via-white to-cyan-50 shadow-[0_22px_52px_-18px_rgba(13,148,136,0.32)] ring-1 ring-white/95',
  'border-2 border-violet-300/85 bg-gradient-to-br from-violet-100 via-white to-fuchsia-50 shadow-[0_22px_52px_-18px_rgba(124,58,237,0.28)] ring-1 ring-white/95',
  'border-2 border-sky-300/85 bg-gradient-to-br from-sky-100 via-white to-indigo-50 shadow-[0_22px_52px_-18px_rgba(14,165,233,0.28)] ring-1 ring-white/95',
  'border-2 border-rose-300/85 bg-gradient-to-br from-orange-100 via-white to-rose-100 shadow-[0_22px_52px_-18px_rgba(244,63,94,0.22)] ring-1 ring-white/95',
  'border-2 border-emerald-400/75 bg-gradient-to-br from-emerald-100 via-white to-teal-50 shadow-[0_22px_52px_-18px_rgba(5,150,105,0.3)] ring-1 ring-white/95',
  'border-2 border-fuchsia-300/85 bg-gradient-to-br from-fuchsia-100 via-white to-purple-50 shadow-[0_22px_52px_-18px_rgba(192,38,211,0.26)] ring-1 ring-white/95',
] as const;

type TopicBodyAccent = { phrase: string; className: string };

function applyTopicBodyAccents(text: string, accents: TopicBodyAccent[]): React.ReactNode {
  if (accents.length === 0) {
    return text;
  }
  const [head, ...tail] = accents;
  const i = text.indexOf(head.phrase);
  if (i === -1) {
    return tail.length > 0 ? applyTopicBodyAccents(text, tail) : text;
  }
  return (
    <>
      {text.slice(0, i)}
      <span className={head.className}>{head.phrase}</span>
      {applyTopicBodyAccents(text.slice(i + head.phrase.length), tail)}
    </>
  );
}

function TopicBodyParagraph({
  body,
  accents,
}: {
  body: string;
  accents: TopicBodyAccent[] | null;
}): React.ReactNode {
  if (!accents?.length) {
    return body;
  }
  return applyTopicBodyAccents(body, accents);
}

export function TopicBentoGrid({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';
  const reduceMotion = useReducedMotion();
  const isCoarse = useCoarsePointer();

  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: isCoarse ? 0 : 0.1 },
      },
    }),
    [isCoarse],
  );

  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: isCoarse ? 12 : 28 },
      show: {
        opacity: 1,
        y: 0,
        transition: {
          duration: isCoarse ? 0.22 : 0.5,
          ease: [0.22, 1, 0.36, 1] as const,
        },
      },
    }),
    [isCoarse],
  );

  return (
    <section className="relative overflow-x-clip bg-gradient-to-b from-emerald-50/50 via-bg-soft to-violet-50/40 px-4 pb-8 pt-20 md:pb-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(167,139,250,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative z-[1] mx-auto max-w-6xl">
        {/* Mascot: absolutely positioned in the open area to the right of the headline; does not consume layout space */}
        <div className="relative">
          <ScrollReveal>
            <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-brand-purple">
              {isBn ? 'যা গুরুত্বপূর্ণ' : 'What matters'}
            </p>
            <h2
              className={`mx-auto mt-3 max-w-6xl px-2 text-center text-3xl font-black leading-[1.15] tracking-tight text-text-main text-balance sm:px-4 sm:text-4xl ${
                isBn
                  ? 'font-bengali md:text-5xl'
                  : 'md:whitespace-nowrap md:text-[2.4rem] lg:text-[2.7rem]'
              }`}
            >
              {isBn ? 'শিশুর বিকাশের ছয়টি স্তম্ভ' : 'Six pillars for your child’s growth'}
            </h2>
          </ScrollReveal>

          <div
            className={`pointer-events-none absolute -right-1 top-[42%] z-20 hidden w-[min(34vw,11rem)] -translate-y-1/2 md:w-[12.5rem] md:-right-2 lg:w-[14rem] xl:-right-3 xl:w-[15rem] ${
              isBn ? 'lg:block' : 'md:block'
            }`}
            aria-hidden
          >
            <HappyKidPillarMascot className="ml-auto w-full" />
          </div>
        </div>

        <div className="relative mt-10 md:mt-12">
          <motion.div
            className="relative z-10 grid grid-cols-1 gap-6 overflow-visible pb-4 pt-4 md:grid-cols-12 md:gap-7 md:pb-5 md:pt-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            // Tall stacked column: `amount: 0.12` required 12% of the whole grid to intersect before
            // the container left `opacity: 0`, which on narrow viewports often meant a large blank gap
            // under the headings. `some` + no negative rootMargin triggers as soon as the grid enters.
            viewport={{ once: true, amount: 'some' }}
          >
            {content.topics.map((topic, index) => {
              const span =
                index === 0
                  ? 'md:col-span-7 md:min-h-[260px]'
                  : index === 1
                    ? 'md:col-span-5 md:min-h-[260px]'
                    : index === 5
                      ? 'md:col-span-12 md:max-w-3xl md:justify-self-center'
                      : 'md:col-span-4';

              const tilt = reduceMotion || isCoarse ? 0 : CARD_TILTS[index % CARD_TILTS.length];

              return (
                <div
                  key={topic.title}
                  className={`relative ${span}`}
                  style={{
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <PillarCardStarBorder variant={index} />
                  <motion.article
                    variants={itemVariants}
                    className={`group relative z-10 flex h-full flex-col overflow-hidden rounded-[2rem] p-8 ${PILLAR_CARD_CLASS[index % PILLAR_CARD_CLASS.length]}`}
                    whileHover={
                      isCoarse
                        ? undefined
                        : reduceMotion
                          ? { scale: 1.01 }
                          : {
                              scale: 1.04,
                              rotateX: 4,
                              rotateY: -3,
                              transition: { type: 'spring', stiffness: 280, damping: 20 },
                            }
                    }
                  >
                    <div
                      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.42)_0%,transparent_52%,rgba(255,255,255,0.14)_100%)] opacity-80"
                      aria-hidden
                    />
                    {/* Subtle corner sparkles — CSS-driven slow orbit (no JS animation layer) */}
                    <div
                      className="pointer-events-none absolute bottom-3 right-3 z-[5] sm:bottom-4 sm:right-4"
                      aria-hidden
                    >
                      <div
                        className={`relative h-10 w-10 opacity-[0.32] ${
                          reduceMotion || isCoarse ? '' : 'animate-corner-spin'
                        }`}
                      >
                        <span
                          className={`absolute left-1/2 top-0 -translate-x-1/2 text-[11px] text-amber-400/90 ${
                            isCoarse ? '' : 'drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]'
                          }`}
                        >
                          ✦
                        </span>
                        <span
                          className={`absolute bottom-0 right-0 text-[9px] text-violet-400/85 ${
                            isCoarse ? '' : 'drop-shadow-[0_0_6px_rgba(167,139,250,0.35)]'
                          }`}
                        >
                          ✦
                        </span>
                        <span
                          className={`absolute bottom-1 left-0 text-[8px] text-teal-400/75 ${
                            isCoarse ? '' : 'drop-shadow-[0_0_6px_rgba(45,212,191,0.3)]'
                          }`}
                        >
                          ✦
                        </span>
                      </div>
                    </div>
                    <div className="relative text-5xl transition duration-300 sm:text-6xl sm:group-hover:scale-105 sm:group-hover:drop-shadow-md">
                      {topic.emoji}
                    </div>
                    <h3
                      className={`relative mt-4 bg-clip-text text-2xl font-black text-transparent ${
                        PILLAR_TITLE_GRADIENT[index % PILLAR_TITLE_GRADIENT.length]
                      } ${isBn ? 'font-bengali' : ''}`}
                    >
                      {topic.title}
                    </h3>
                    <p
                      className={`relative mt-3 flex-1 text-lg leading-relaxed text-text-soft ${
                        isBn ? 'font-bengali' : ''
                      }`}
                    >
                      <TopicBodyParagraph
                        body={topic.body}
                        accents={
                          index === 0
                            ? [
                                {
                                  phrase: isBn
                                    ? BN_HEALTH_SLEEP_HABIT_PHRASE
                                    : EN_HEALTH_SLEEP_HABIT_PHRASE,
                                  className: 'font-semibold text-teal-900',
                                },
                              ]
                            : index === 1
                              ? [
                                  {
                                    phrase: isBn
                                      ? BN_EDUCATION_BODY_ACCENT
                                      : EN_EDUCATION_BODY_ACCENT,
                                    className: 'font-semibold text-violet-900',
                                  },
                                ]
                              : index === 2
                                ? [
                                    {
                                      phrase: isBn
                                        ? BN_MENTAL_QUOTE_ACCENT
                                        : EN_MENTAL_QUOTE_ACCENT,
                                      className: 'font-semibold text-sky-800',
                                    },
                                  ]
                                : index === 3
                                  ? [
                                      {
                                        phrase: isBn
                                          ? BN_EMOTIONAL_LOVE_PHRASE
                                          : EN_EMOTIONAL_LOVE_PHRASE,
                                        className: 'font-semibold text-rose-800',
                                      },
                                    ]
                                  : index === 4
                                    ? [
                                        {
                                          phrase: isBn
                                            ? BN_PHYSICAL_SUN_VITAMIN_PHRASE
                                            : EN_PHYSICAL_SUN_VITAMIN_PHRASE,
                                          className: 'font-semibold text-emerald-800',
                                        },
                                      ]
                                    : index === 5
                                      ? [
                                          {
                                            phrase: isBn
                                              ? BN_PLAY_SOCIAL_CONFIDENCE_PHRASE
                                              : EN_PLAY_SOCIAL_OUTCOME_PHRASE,
                                            className: 'font-semibold text-fuchsia-800',
                                          },
                                        ]
                                      : null
                        }
                      />
                    </p>
                    <span className="relative mt-6 inline-block w-fit rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-brand-teal shadow-[0_4px_14px_rgba(0,168,120,0.2)] ring-1 ring-white/80">
                      {topic.tag}
                    </span>
                  </motion.article>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
