'use client';

import { motion } from 'framer-motion';

import type { LandingContent } from '@/lib/content';

import { ScrollReveal } from './ScrollReveal';

type Props = {
  content: LandingContent;
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function TopicBentoGrid({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <section className="bg-bg-soft px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-brand-purple">
            {isBn ? 'যা গুরুত্বপূর্ণ' : 'What matters'}
          </p>
          <h2
            className={`mt-3 text-center text-3xl font-black text-text-main sm:text-4xl md:text-5xl ${
              isBn ? 'font-bengali' : ''
            }`}
          >
            {isBn
              ? 'শিশুর বিকাশের ছয়টি স্তম্ভ'
              : 'Six pillars for your child’s growth'}
          </h2>
        </ScrollReveal>

        <motion.div
          className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
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

            return (
              <motion.article
                key={topic.title}
                variants={item}
                className={`group relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br p-8 shadow-xl ${topic.gradientClass} ${span}`}
                style={{ perspective: 1200 }}
                whileHover={{
                  scale: 1.03,
                  rotateX: 3,
                  rotateY: -3,
                  transition: { type: 'spring', stiffness: 260, damping: 22 },
                }}
              >
                <div className="text-5xl transition group-hover:animate-float-drift sm:text-6xl">
                  {topic.emoji}
                </div>
                <h3
                  className={`mt-4 text-2xl font-black text-text-main ${
                    isBn ? 'font-bengali' : ''
                  }`}
                >
                  {topic.title}
                </h3>
                <p
                  className={`mt-3 text-lg leading-relaxed text-text-soft ${
                    isBn ? 'font-bengali' : ''
                  }`}
                >
                  {topic.body}
                </p>
                <span className="mt-6 inline-block rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-brand-teal shadow-sm">
                  {topic.tag}
                </span>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
