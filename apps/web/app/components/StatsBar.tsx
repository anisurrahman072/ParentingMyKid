'use client';

import { animate } from 'framer-motion';
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

export function StatsBar({ content }: Props): React.ReactElement {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });
  const isEn = content.locale === 'en';

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-gradient-to-r from-brand-teal via-emerald-500 to-brand-purple px-4 py-14 text-white shadow-inner"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-10 text-center sm:grid-cols-3 sm:gap-6">
        <StatBlock
          isInView={isInView}
          isEn={isEn}
          valueEn={10000}
          suffixEn="+"
          displayBn={content.stats.v1}
          label={content.stats.l1}
        />
        <StatBlock
          isInView={isInView}
          isEn={isEn}
          valueEn={6}
          suffixEn=""
          displayBn={content.stats.v2}
          label={content.stats.l2}
        />
        <StatBlockText
          isInView={isInView}
          value={content.stats.v3}
          label={content.stats.l3}
        />
      </div>
    </section>
  );
}

function StatBlock({
  isInView,
  isEn,
  valueEn,
  suffixEn,
  displayBn,
  label,
}: {
  isInView: boolean;
  isEn: boolean;
  valueEn: number;
  suffixEn: string;
  displayBn: string;
  label: string;
}): React.ReactElement {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!isInView || !isEn) return;
    const controls = animate(0, valueEn, {
      duration: 2.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
  }, [isInView, isEn, valueEn]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center gap-2"
    >
      <p className="text-4xl font-black tabular-nums drop-shadow-md sm:text-5xl">
        {isEn ? (
          <>
            {valueEn >= 1000
              ? Math.round(n).toLocaleString('en-US')
              : Math.round(n)}
            {suffixEn}
          </>
        ) : (
          displayBn
        )}
      </p>
      <p className="text-base font-semibold text-white/95 sm:text-lg">{label}</p>
    </motion.div>
  );
}

function StatBlockText({
  isInView,
  value,
  label,
}: {
  isInView: boolean;
  value: string;
  label: string;
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="flex flex-col items-center gap-2"
    >
      <p className="text-4xl font-black sm:text-5xl">{value}</p>
      <p className="text-base font-semibold text-white/95 sm:text-lg">{label}</p>
    </motion.div>
  );
}
