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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(167,139,250,0.12),transparent)]" aria-hidden />
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
            viewport={{ once: true, margin: '-80px', amount: 0.12 }}
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

              const tilt =
                reduceMotion || isCoarse ? 0 : CARD_TILTS[index % CARD_TILTS.length];

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
                    className={`group relative z-10 flex h-full flex-col overflow-hidden rounded-[2rem] p-8 ${topic.gradientClass}`}
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
                    <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.55)_0%,transparent_48%,rgba(255,255,255,0.2)_100%)] opacity-70" aria-hidden />
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
                      {topic.body}
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
