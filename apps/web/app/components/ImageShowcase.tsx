'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import type {
  FacebookFeedPage,
  FacebookFeedPost,
  FacebookFeedResponse,
} from '@/lib/facebook-feed';
import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

function TwoCardStack({ isBn }: { isBn: boolean }): React.ReactElement {
  const banner1Alt = isBn
    ? 'শিশু ও পরিবার — উষ্ণ, বোধগম্য প্যারেন্টিং চিত্র'
    : 'Parenting illustration — warm moments with children and family connection';
  const banner2Alt = isBn
    ? 'খেলা, শেখা ও আবেগ — ইতিবাচক শৈশবের চিত্র'
    : 'Play, learning, and emotions — positive childhood moments illustration';

  return (
    <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-8 md:min-h-[360px] md:flex-row md:gap-4">
      <motion.div
        initial={{ opacity: 0, rotate: -6, y: 40 }}
        whileInView={{ opacity: 1, rotate: -2, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 80 }}
        className="relative z-20 w-full max-w-md -rotate-2 shadow-2xl shadow-brand-teal/20 md:max-w-lg"
      >
        <Image
          src="/banner-1.png"
          alt={banner1Alt}
          width={900}
          height={500}
          className="rounded-3xl border-4 border-white object-cover"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, rotate: 6, y: 40 }}
        whileInView={{ opacity: 1, rotate: 2, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 80, delay: 0.08 }}
        className="relative z-10 w-full max-w-md rotate-2 shadow-2xl shadow-brand-purple/25 md:absolute md:right-4 md:top-12 md:max-w-lg"
      >
        <Image
          src="/banner-2.png"
          alt={banner2Alt}
          width={900}
          height={500}
          className="rounded-3xl border-4 border-white object-cover"
        />
      </motion.div>
    </div>
  );
}

function BnGalleryGrid({
  items,
}: {
  items: { src: string; alt: string }[];
}): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
      {items.map((item, i) => (
        <motion.div
          key={item.src}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-32px' }}
          transition={{ type: 'spring', stiffness: 90, delay: i * 0.07 }}
          className="group relative overflow-hidden rounded-2xl border-4 border-white bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/90"
        >
          <div className="relative aspect-[9/5] w-full">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FeedSkeleton({ isBn }: { isBn: boolean }): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.15)]"
        >
          <div className="h-1.5 bg-[#1877F2]/90" />
          <div className="flex gap-3 px-4 pb-2 pt-4">
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 animate-pulse rounded bg-slate-200" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="aspect-[9/5] animate-pulse bg-slate-200/80" />
          <div className="space-y-2 px-4 py-3">
            <div className="h-3 w-full animate-pulse rounded bg-slate-200/70" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200/70" />
          </div>
          <div className="flex justify-between border-t border-slate-100 px-4 py-3">
            <div className="h-3 w-14 animate-pulse rounded bg-slate-200/80" />
            <div className="h-3 w-14 animate-pulse rounded bg-slate-200/80" />
            <div className="h-3 w-14 animate-pulse rounded bg-slate-200/80" />
          </div>
        </div>
      ))}
      <span className="sr-only">
        {isBn ? 'ফেসবুক পোস্ট লোড হচ্ছে' : 'Loading Facebook posts'}
      </span>
    </div>
  );
}

function formatRelativePast(iso: string, locale: string): string {
  const when = new Date(iso);
  const diffSec = Math.round((when.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, secs] of divisions) {
    if (abs >= secs || unit === 'second') {
      const v = Math.trunc(diffSec / secs);
      return rtf.format(v, unit);
    }
  }
  return rtf.format(0, 'second');
}

function IconHeart(): React.ReactElement {
  return (
    <svg className="size-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function IconComment(): React.ReactElement {
  return (
    <svg className="size-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
  );
}

function IconShare(): React.ReactElement {
  return (
    <svg className="size-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
    </svg>
  );
}

function IconEye(): React.ReactElement {
  return (
    <svg className="size-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );
}

function FacebookPostCard({
  post,
  index,
  isBn,
  page,
  labels,
}: {
  post: FacebookFeedPost;
  index: number;
  isBn: boolean;
  page: FacebookFeedPage | null;
  labels: {
    reactions: string;
    comments: string;
    shares: string;
    views: string;
    public: string;
    open: string;
  };
}): React.ReactElement {
  const locale = isBn ? 'bn-BD' : 'en-US';
  const relative = formatRelativePast(post.createdTime, locale);
  const pageName = page?.name ?? 'Parenting My Kid';

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ type: 'spring', stiffness: 90, delay: index * 0.07 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_48px_-12px_rgba(15,23,42,0.18)]"
    >
      <div className="h-1 bg-[#1877F2]" aria-hidden />

      <div className="flex items-start gap-3 px-4 pb-2 pt-3.5">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white shadow-sm">
          {page?.pictureUrl ? (
            <Image
              src={page.pictureUrl}
              alt={`${pageName} profile picture`}
              width={80}
              height={80}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#1877F2] to-[#0d47a1] text-sm font-bold text-white">
              {pageName.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="truncate text-[15px] font-semibold leading-tight text-[#050505]">
              {pageName}
            </span>
          </div>
          <div
            className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[#65676B] ${
              isBn ? 'font-bengali' : ''
            }`}
          >
            <span>{relative}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1" title={labels.public}>
              <svg className="size-3.5 opacity-80" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11z" />
              </svg>
              {labels.public}
            </span>
          </div>
        </div>
      </div>

      <div className={`px-4 pb-2 ${isBn ? 'font-bengali' : ''}`}>
        <p className="line-clamp-4 text-[15px] leading-snug text-[#050505]">{post.text}</p>
      </div>

      <a
        href={post.permalinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-2"
      >
        {post.imageUrl ? (
          <div className="relative aspect-[1.91/1] w-full bg-[#F0F2F5] sm:aspect-[9/5]">
            <Image
              src={post.imageUrl}
              alt={
                post.text.trim().length > 0
                  ? post.text.trim().slice(0, 125) + (post.text.trim().length > 125 ? '…' : '')
                  : isBn
                    ? 'ফেসবুক পোস্টের ছবি'
                    : 'Facebook post image'
              }
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-300 group-hover:brightness-[0.98]"
            />
          </div>
        ) : null}
      </a>

      <div
        className={`border-t border-[#E4E6EB] bg-[#F7F8FA] px-2 py-2.5 ${
          isBn ? 'font-bengali' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-around gap-2 text-center text-[13px] text-[#65676B]">
          <span className="inline-flex min-w-[4.5rem] flex-col items-center gap-0.5 sm:flex-row sm:gap-1">
            <IconHeart />
            <span className="tabular-nums text-[#050505]">
              {post.reactionCount.toLocaleString(locale)}
            </span>
            <span className="hidden sm:inline">{labels.reactions}</span>
          </span>
          <span className="inline-flex min-w-[4.5rem] flex-col items-center gap-0.5 sm:flex-row sm:gap-1">
            <IconComment />
            <span className="tabular-nums text-[#050505]">
              {post.commentCount.toLocaleString(locale)}
            </span>
            <span className="hidden sm:inline">{labels.comments}</span>
          </span>
          <span className="inline-flex min-w-[4.5rem] flex-col items-center gap-0.5 sm:flex-row sm:gap-1">
            <IconShare />
            <span className="tabular-nums text-[#050505]">
              {post.shareCount.toLocaleString(locale)}
            </span>
            <span className="hidden sm:inline">{labels.shares}</span>
          </span>
          <span
            className="inline-flex min-w-[4.5rem] flex-col items-center gap-0.5 sm:flex-row sm:gap-1"
            title={post.viewCount === null ? labels.views : undefined}
          >
            <IconEye />
            <span className="tabular-nums text-[#050505]">
              {post.viewCount === null ? '—' : post.viewCount.toLocaleString(locale)}
            </span>
            <span className="hidden sm:inline">{labels.views}</span>
          </span>
        </div>
      </div>

      <div className="border-t border-[#E4E6EB] bg-white px-4 py-2.5 text-center">
        <a
          href={post.permalinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-semibold text-[#1877F2] hover:underline"
        >
          {labels.open}
        </a>
      </div>
    </motion.article>
  );
}

export function ImageShowcase({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';
  const gallery = content.showcase.gallery;
  const useBnGallery = Boolean(gallery && gallery.length >= 3);

  const labels = isBn
    ? {
        reactions: 'রিয়াকশন',
        comments: 'মন্তব্য',
        shares: 'শেয়ার',
        views: 'ভিউ',
        public: 'সবার জন্য',
        open: 'ফেসবুকে পোস্ট দেখুন',
      }
    : {
        reactions: 'reactions',
        comments: 'comments',
        shares: 'shares',
        views: 'views',
        public: 'Public',
        open: 'View post on Facebook',
      };

  const [feed, setFeed] = useState<FacebookFeedResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/facebook/posts', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as FacebookFeedResponse;
        if (cancelled) return;
        setFeed(data);
      } catch {
        if (!cancelled) {
          setFeed({
            configured: false,
            posts: [],
            page: null,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const feedPosts = feed?.posts ?? null;
  const feedConfigured = Boolean(feed?.configured);
  const feedPage = feed?.page ?? null;
  const graphError = feed?.graphError;

  const showLiveFeed =
    feedPosts !== null && feedConfigured && feedPosts.length > 0;
  const showLoading = feedPosts === null;

  let main: React.ReactElement;
  if (showLoading) {
    main = <FeedSkeleton isBn={isBn} />;
  } else if (showLiveFeed) {
    main = (
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
        {feedPosts!.map((post, i) => (
          <FacebookPostCard
            key={post.id}
            post={post}
            index={i}
            isBn={isBn}
            page={feedPage}
            labels={labels}
          />
        ))}
      </div>
    );
  } else {
    main = useBnGallery ? (
      <BnGalleryGrid items={gallery!} />
    ) : (
      <TwoCardStack isBn={isBn} />
    );
  }

  return (
    <section className="bg-bg-base px-4 py-12 md:py-14">
      <div className="mx-auto max-w-6xl">
        {main}

        {graphError && !showLiveFeed && feedConfigured ? (
          <p
            className={`mt-6 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950/90 ${
              isBn ? 'font-bengali' : ''
            }`}
            role="status"
          >
            {isBn
              ? `ফেসবুক ফিড লোড হয়নি: ${graphError} — টোকেন ও পেজের অনুমতি চেক করুন।`
              : `Could not load Facebook posts: ${graphError} — verify the page token and permissions.`}
          </p>
        ) : null}

        <p
          className={`mt-10 text-center text-lg text-text-soft md:mt-12 ${
            isBn ? 'font-bengali' : ''
          }`}
        >
          {content.showcase.caption}{' '}
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-teal underline decoration-2 underline-offset-4 hover:text-brand-purple"
          >
            {content.showcase.linkLabel}
          </a>
        </p>
      </div>
    </section>
  );
}
