import { NextResponse } from 'next/server';

import type {
  FacebookFeedPage,
  FacebookFeedPost,
  FacebookFeedResponse,
} from '@/lib/facebook-feed';

export const dynamic = 'force-dynamic';

const GRAPH_VERSION = 'v21.0';

const FIELDS_FULL = [
  'id',
  'message',
  'story',
  'created_time',
  'permalink_url',
  'full_picture',
  'attachments{media{image{src}},subattachments{media{image{src}}}}',
  'reactions.limit(0).summary(true)',
  'comments.limit(0).summary(true)',
  'shares',
].join(',');

const FIELDS_LITE = [
  'id',
  'message',
  'story',
  'created_time',
  'permalink_url',
  'full_picture',
  'attachments{media{image{src}},subattachments{media{image{src}}}}',
].join(',');

type GraphSummary = { summary?: { total_count?: number } };

type GraphMediaImage = { src?: string };
type GraphSubattachment = { media?: { image?: GraphMediaImage } };
type GraphAttachment = {
  media?: { image?: GraphMediaImage };
  subattachments?: { data?: GraphSubattachment[] };
};

type GraphPost = {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  permalink_url: string;
  full_picture?: string;
  attachments?: { data?: GraphAttachment[] };
  reactions?: GraphSummary;
  comments?: GraphSummary;
  shares?: { count?: number };
};

type GraphListResponse = {
  data?: GraphPost[];
  error?: { message?: string; code?: number };
};

type GraphPageResponse = {
  name?: string;
  picture?: { data?: { url?: string } };
  error?: { message?: string };
};

async function graphJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  return res.json();
}

function pickImageUrl(post: GraphPost): string | null {
  if (post.full_picture) return post.full_picture;
  const first = post.attachments?.data?.[0];
  const fromMain = first?.media?.image?.src;
  if (fromMain) return fromMain;
  const sub = first?.subattachments?.data?.[0]?.media?.image?.src;
  if (sub) return sub;
  return null;
}

function normalizePost(post: GraphPost, viewCount: number | null): FacebookFeedPost | null {
  const text = (post.message ?? post.story ?? '').trim();
  const imageUrl = pickImageUrl(post);
  if (!text && !imageUrl) return null;
  if (!post.permalink_url) return null;

  return {
    id: post.id,
    text: text || '—',
    createdTime: post.created_time,
    permalinkUrl: post.permalink_url,
    imageUrl,
    reactionCount: post.reactions?.summary?.total_count ?? 0,
    commentCount: post.comments?.summary?.total_count ?? 0,
    shareCount: post.shares?.count ?? 0,
    viewCount,
  };
}

async function fetchPageMeta(
  token: string,
  pageId: string,
): Promise<{ page: FacebookFeedPage | null; error?: string }> {
  const u = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}`,
  );
  u.searchParams.set('fields', 'name,picture{url}');
  u.searchParams.set('access_token', token);

  const raw = (await graphJson(u.toString())) as GraphPageResponse;
  if (raw.error?.message) {
    return { page: null, error: raw.error.message };
  }
  const name = raw.name?.trim();
  if (!name) {
    return { page: null };
  }
  return {
    page: {
      name,
      pictureUrl: raw.picture?.data?.url ?? null,
    },
  };
}

async function fetchPostList(
  token: string,
  pageId: string,
  edge: 'posts' | 'feed',
  fields: string,
): Promise<GraphListResponse> {
  const u = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/${edge}`,
  );
  u.searchParams.set('fields', fields);
  u.searchParams.set('limit', '24');
  u.searchParams.set('access_token', token);
  return graphJson(u.toString()) as Promise<GraphListResponse>;
}

async function loadPostsWithFallback(
  token: string,
  pageId: string,
): Promise<{ posts: GraphPost[]; graphError?: string }> {
  const attempts: { edge: 'posts' | 'feed'; fields: string }[] = [
    { edge: 'posts', fields: FIELDS_FULL },
    { edge: 'feed', fields: FIELDS_FULL },
    { edge: 'posts', fields: FIELDS_LITE },
    { edge: 'feed', fields: FIELDS_LITE },
  ];

  let lastError: string | undefined;

  for (const { edge, fields } of attempts) {
    const body = await fetchPostList(token, pageId, edge, fields);
    if (body.error) {
      lastError = body.error.message ?? `Graph error ${body.error.code ?? ''}`.trim();
      console.error('[facebook/posts]', edge, fields.slice(0, 40), body.error);
      continue;
    }
    const data = body.data ?? [];
    if (data.length > 0) {
      return { posts: data };
    }
  }

  return { posts: [], graphError: lastError ?? 'No posts returned from Graph API.' };
}

function parseInsightValue(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.max(0, Math.floor(v));
  if (typeof v === 'string') {
    const n = Number.parseInt(v.replace(/,/g, ''), 10);
    return Number.isNaN(n) ? null : Math.max(0, n);
  }
  return null;
}

/**
 * Page post insights need `read_insights` on the token. We try several metrics
 * because availability varies by post type / API version.
 */
async function fetchPostImpressions(
  postId: string,
  token: string,
): Promise<number | null> {
  const metricsPreferred = [
    'post_impressions',
    'post_impressions_unique',
    'post_reach',
  ] as const;

  const fetchMetrics = async (metricParam: string): Promise<number | null> => {
    const u = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(postId)}/insights`,
    );
    u.searchParams.set('metric', metricParam);
    u.searchParams.set('access_token', token);

    const raw = (await graphJson(u.toString())) as {
      data?: { name?: string; values?: { value?: unknown }[] }[];
      error?: { message?: string };
    };
    if (raw.error) return null;
    const rows = raw.data ?? [];
    for (const name of metricsPreferred) {
      const row = rows.find((d) => d.name === name);
      const v = parseInsightValue(row?.values?.[0]?.value);
      if (v !== null) return v;
    }
    return null;
  };

  try {
    const combined = await fetchMetrics(metricsPreferred.join(','));
    if (combined !== null) return combined;
    for (const m of metricsPreferred) {
      const one = await fetchMetrics(m);
      if (one !== null) return one;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse<FacebookFeedResponse>> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ configured: false, posts: [], page: null });
  }

  const pageId =
    process.env.FACEBOOK_PAGE_ID?.trim() || 'ParentingMyKid.page';

  try {
    const [{ page: pageMeta, error: pageErr }, rawList] = await Promise.all([
      fetchPageMeta(token, pageId),
      loadPostsWithFallback(token, pageId),
    ]);

    const graphError = rawList.graphError ?? pageErr;
    const raw = rawList.posts;

    /** Pick displayable candidates first, then fetch impressions only for the top 3 (parallel). */
    const candidates: GraphPost[] = [];
    for (const p of raw) {
      const text = (p.message ?? p.story ?? '').trim();
      const imageUrl = pickImageUrl(p);
      if (!p.permalink_url) continue;
      if (!text && !imageUrl) continue;
      candidates.push(p);
      if (candidates.length >= 12) break;
    }

    const top = candidates.slice(0, 3);
    const impressions = await Promise.all(
      top.map((p) => fetchPostImpressions(p.id, token)),
    );

    const collected: FacebookFeedPost[] = [];
    for (let i = 0; i < top.length; i++) {
      const n = normalizePost(top[i]!, impressions[i] ?? null);
      if (n) collected.push(n);
    }

    const payload: FacebookFeedResponse = {
      configured: true,
      posts: collected,
      page: pageMeta,
      ...(graphError && collected.length === 0 ? { graphError } : {}),
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error('[facebook/posts]', e);
    return NextResponse.json({
      configured: true,
      posts: [],
      page: null,
      graphError: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
