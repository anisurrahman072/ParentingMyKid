'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { XPremiumCircleLink } from '@/app/components/XFollowButton';
import { FACEBOOK_PAGE_URL } from '@/lib/constants';

const DEENI_BENEFITS = [
  {
    step: '০১',
    kicker: 'কুরআন-সুন্নাহভিত্তিক চরিত্র',
    title: 'দ্বীনি শিক্ষা চরিত্রকে সুন্দর করে',
    body: 'ছোটবেলা থেকে কুরআন-সুন্নাহভিত্তিক শিক্ষা শিশুকে সত্যবাদী, দায়িত্বশীল এবং ভদ্র আচরণে অভ্যস্ত করে তোলে।',
    frame: 'from-amber-300/90 via-teal-300/50 to-cyan-300/70',
    iconBg: 'from-amber-400/35 to-amber-200/10',
  },
  {
    step: '০২',
    kicker: 'সীমা বোঝা ও নিরাপত্তা',
    title: 'ইসলামি আদব-আখলাক জীবনকে নিরাপদ রাখে',
    body: 'হালাল-হারাম, ভালো-মন্দ ও সীমা বোঝার অভ্যাস শিশুকে খারাপ সঙ্গ, ক্ষতিকর আচরণ এবং অশোভন প্রভাব থেকে নিজেকে রক্ষা করতে শেখায়।',
    frame: 'from-cyan-300/85 via-emerald-300/45 to-teal-400/75',
    iconBg: 'from-cyan-400/35 to-teal-300/10',
  },
  {
    step: '০৩',
    kicker: 'প্রতিদিনের ছোট আমল',
    title: 'প্রতিদিনের ছোট আমল বড় ভিত্তি গড়ে',
    body: 'দোয়া, সালাম, শোকর ও নামাজের প্রতি ভালোবাসা শিশুর মনে আল্লাহভীতি, আত্মনিয়ন্ত্রণ ও শান্ত স্বভাব গড়ে তোলে।',
    frame: 'from-teal-300/80 via-amber-200/40 to-emerald-300/65',
    iconBg: 'from-teal-400/30 to-emerald-400/10',
  },
  {
    step: '০৪',
    kicker: 'পরিবার ও উম্মাহর প্রতি দায়',
    title: 'পরিবার ও ভবিষ্যৎ হয় আরও আলোকিত',
    body: 'দ্বীনি মূল্যবোধে বড় হওয়া শিশুরা পরিবারকে সম্মান করে, মানুষের উপকার করে এবং দায়িত্বশীল নাগরিক হিসেবে বেড়ে ওঠে।',
    frame: 'from-amber-200/75 via-cyan-300/50 to-teal-400/80',
    iconBg: 'from-amber-300/35 to-cyan-300/10',
  },
] as const;

function MasjidMinaretHeader({ animate }: { animate: boolean }): React.ReactElement {
  return (
    <div
      className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-1 sm:px-2"
      aria-hidden
    >
      <p className="font-bengali mx-auto mb-3 w-full max-w-[min(100%,22rem)] px-2 text-center text-[10px] font-semibold leading-snug text-amber-100/85 text-balance sm:max-w-none sm:px-0 sm:leading-none sm:whitespace-nowrap sm:text-xs md:text-sm md:leading-snug">
        নৈতিক শিক্ষা ও আদব—শিশুর ভবিষ্যৎকে শান্তি ও আদর্শের পথে নিয়ে যায়।
      </p>

      <svg
        className="h-[72px] w-[220px] md:h-[88px] md:w-[260px]"
        viewBox="0 0 260 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="deeni-minaret"
            x1="40"
            y1="0"
            x2="220"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FDE68A" />
            <stop offset="0.5" stopColor="#5EEAD4" />
            <stop offset="1" stopColor="#34D399" />
          </linearGradient>
          <linearGradient
            id="deeni-dome"
            x1="130"
            y1="8"
            x2="130"
            y2="52"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FEF3C7" />
            <stop offset="1" stopColor="#99F6E4" />
          </linearGradient>
        </defs>

        {/* Left minaret — simple cartoon tower */}
        <path d="M44 92V36h22v56H44z" fill="url(#deeni-minaret)" opacity={0.95} />
        <path d="M48 36c0-8 6-14 14-14s14 6 14 14H48z" fill="#FDE68A" opacity={0.9} />
        <rect x="50" y="24" width="10" height="5" rx="1.5" fill="#FFFBEB" opacity={0.95} />

        {/* Center dome + prayer hall */}
        <ellipse cx="130" cy="32" rx="36" ry="19" fill="url(#deeni-dome)" />
        <path d="M94 50h72v42H94V50z" fill="url(#deeni-minaret)" opacity={0.88} />
        <path d="M116 92h28v5h-28v-5z" fill="#FDE68A" opacity={0.85} />
        <path d="M110 74c0-11 9-20 20-20s20 9 20 20v18H110V74z" fill="#042F2E" fillOpacity={0.32} />

        {/* Right minaret */}
        <path d="M194 92V36h22v56h-22z" fill="url(#deeni-minaret)" opacity={0.95} />
        <path d="M198 36c0-8 6-14 14-14s14 6 14 14h-28z" fill="#FDE68A" opacity={0.9} />
        <rect x="200" y="24" width="10" height="5" rx="1.5" fill="#FFFBEB" opacity={0.95} />

        {/* Crescent + star — soft, kid-friendly */}
        <motion.g
          animate={
            animate
              ? {
                  y: [0, -2, 0],
                }
              : undefined
          }
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M130 10c3 0 5.5 2.2 5.5 5s-2.5 5-5.5 5c-1.2 0-2.3-.4-3.2-1 2 .2 3.7-1.5 3.7-3.5S129 11 127 11c.9-.6 2-1 3-1z"
            fill="#FEF08A"
          />
          <path
            d="M142 14l1.2 2.6 2.8.3-2.1 2 0.5 2.8-2.4-1.3-2.4 1.3 0.5-2.8-2.1-2 2.8-.3z"
            fill="#FDE047"
          />
        </motion.g>
      </svg>
    </div>
  );
}

function CurvedRibbonDecor({ animate }: { animate: boolean }): React.ReactElement {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-0 h-24 md:top-[5.25rem]"
      aria-hidden
    >
      <svg className="h-full w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <defs>
          <linearGradient
            id="deeni-ribbon-a"
            x1="0"
            y1="0"
            x2="1200"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FDE68A" stopOpacity="0" />
            <stop offset="0.35" stopColor="#FDE68A" stopOpacity="0.85" />
            <stop offset="0.65" stopColor="#5EEAD4" stopOpacity="0.75" />
            <stop offset="1" stopColor="#34D399" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="deeni-ribbon-b"
            x1="1200"
            y1="0"
            x2="0"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#34D399" stopOpacity="0" />
            <stop offset="0.4" stopColor="#5EEAD4" stopOpacity="0.7" />
            <stop offset="0.7" stopColor="#FBBF24" stopOpacity="0.65" />
            <stop offset="1" stopColor="#FBBF24" stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          d="M0 85 C 200 20, 400 20, 600 78 S 1000 120, 1200 40"
          fill="none"
          stroke="url(#deeni-ribbon-a)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={animate ? { pathLength: 0, opacity: 0.5 } : undefined}
          animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
        />
        <motion.path
          d="M1200 90 C 1000 25, 800 25, 600 82 S 200 115, 0 48"
          fill="none"
          stroke="url(#deeni-ribbon-b)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={animate ? { pathLength: 0, opacity: 0.45 } : undefined}
          animate={animate ? { pathLength: 1, opacity: 0.95 } : undefined}
          transition={{
            duration: 2.6,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 0.4,
          }}
        />
      </svg>

      {/* Diamond sparkles on the ribbons */}
      <motion.div
        className="absolute left-[8%] top-6 h-3 w-3 rotate-45 rounded-sm bg-gradient-to-br from-amber-200 to-amber-50 shadow-[0_0_14px_rgba(253,224,71,0.55)] md:left-[12%]"
        animate={
          animate
            ? { opacity: [0.45, 1, 0.55], scale: [0.92, 1.08, 0.95], y: [0, -4, 0] }
            : undefined
        }
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[8%] top-8 h-3.5 w-3.5 rotate-45 rounded-sm bg-gradient-to-br from-cyan-200 to-teal-100 shadow-[0_0_16px_rgba(45,212,191,0.5)] md:right-[12%]"
        animate={
          animate ? { opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.96], y: [0, 3, 0] } : undefined
        }
        transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
    </div>
  );
}

export function DeeniLearningSection({
  followXAria,
}: {
  followXAria: string;
}): React.ReactElement {
  const reduceMotion = useReducedMotion() ?? false;
  const animate = !reduceMotion;

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-6 md:pb-14 md:pt-8">
      {/* Premium outer field — fills the “empty” margin around the inner card */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-50/95 via-teal-50/55 to-cyan-50/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-15%,rgba(253,230,138,0.42),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_100%_35%,rgba(45,212,191,0.22),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_0%_75%,rgba(16,185,129,0.14),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,251,235,0.5)_0%,transparent_38%,transparent_62%,rgba(204,251,241,0.45)_100%)]"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-amber-200/65 bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-900 px-6 py-10 shadow-[0_26px_80px_-26px_rgba(6,78,59,0.62)] ring-1 ring-white/20 md:px-10 md:py-12">
          <div
            className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan-200/20 blur-3xl"
            aria-hidden
          />

          <CurvedRibbonDecor animate={animate} />

          <div className="relative z-[1]">
            <MasjidMinaretHeader animate={animate} />

            <p className="font-bengali relative z-[1] mt-6 text-center text-sm font-bold tracking-wide text-amber-200/95">
              দ্বীনি শিক্ষা · মা-বাবার দায়িত্ব
            </p>
            <h3 className="font-bengali relative z-[1] mx-auto mt-3 max-w-4xl text-center text-3xl font-black leading-tight text-white md:text-5xl">
              দ্বীনি শিক্ষা—মা-বাবার প্রথম দায়িত্ব
            </h3>
            <p className="font-bengali relative z-[1] mx-auto mt-4 max-w-3xl text-center text-base leading-relaxed text-emerald-50/95 md:text-lg">
              ছোটবেলায় শেখানো আদব, তাকওয়া ও নৈতিকতা—ভবিষ্যৎ নিরাপদ ও আলোকিত করে।
              <br />
              বাড়িতেই ধারাবাহিক দ্বীনি শিক্ষা কেন জরুরি, তা এই চারটি কারণে স্পষ্ট।
            </p>
            <p className="relative z-[1] mt-3 text-center text-sm font-medium text-emerald-100/90">
              Increase your child&apos;s learning daily.
            </p>

            <div className="relative z-[1] mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
              {DEENI_BENEFITS.map((item, i) => (
                <motion.article
                  key={item.title}
                  initial={animate ? { opacity: 0, y: 16 } : false}
                  whileInView={animate ? { opacity: 1, y: 0 } : undefined}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={animate ? { y: -4, scale: 1.01 } : undefined}
                  className={`group relative rounded-[1.75rem] bg-gradient-to-br p-[1px] shadow-[0_20px_50px_-18px_rgba(0,0,0,0.55)] ${item.frame}`}
                >
                  {/* Inner premium panel */}
                  <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-gradient-to-b from-emerald-950/95 via-teal-950/90 to-cyan-950/85 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm md:px-6 md:py-6">
                    {/* Soft corner arcs */}
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-amber-300/15"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full border border-cyan-300/10"
                      aria-hidden
                    />

                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner ring-1 ring-white/15 ${item.iconBg}`}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/80">
                          ধাপ
                        </span>
                        <span className="font-bengali text-xl font-black leading-none text-white">
                          {item.step}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bengali text-xs font-semibold text-teal-200/95 md:text-sm">
                          {item.kicker}
                        </p>
                        <h4 className="font-bengali mt-1 text-lg font-extrabold leading-snug text-amber-50 md:text-xl">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                    <p className="font-bengali mt-4 bg-gradient-to-r from-amber-100/95 via-teal-100 to-cyan-100 bg-clip-text text-[0.95rem] font-medium leading-relaxed text-transparent md:text-base">
                      {item.body}
                    </p>

                    {/* Bottom cartoon line accent */}
                    <svg
                      className="mt-5 h-3 w-full text-amber-200/35"
                      viewBox="0 0 400 12"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <path
                        d="M0 8 Q 100 2 200 8 T 400 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-9 md:mt-12">
          <div className="group relative mx-auto w-full max-w-3xl rounded-2xl border border-teal-200/70 bg-gradient-to-r from-emerald-50/95 via-white/95 to-amber-50/95 px-4 py-4 text-center shadow-[0_14px_36px_-20px_rgba(13,148,136,0.28)] ring-1 ring-amber-100/70 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-18px_rgba(13,148,136,0.35)] md:px-6">
            <span
              className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-200/25 via-teal-200/20 to-cyan-200/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <div className="relative">
              <p className="font-bengali mt-2 bg-gradient-to-r from-emerald-700 via-cyan-700 to-violet-700 bg-clip-text text-sm font-semibold leading-relaxed text-transparent md:text-base">
                প্যারেন্টিং ও শিশু গড়ে তোলার প্রয়োজনীয় দিকনির্দেশনা নিয়মিত শেয়ার করা হয়।
              </p>
            </div>
            <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2.5">
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bengali inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 via-cyan-600 to-violet-600 px-7 py-2.5 text-base font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(8,145,178,0.7)] transition-transform duration-300 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 md:text-lg"
              >
                ফেসবুকে ফলো করুন
              </a>
              <XPremiumCircleLink
                ariaLabel={followXAria}
                className="h-10 w-10 md:h-[2.75rem] md:w-[2.75rem]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
