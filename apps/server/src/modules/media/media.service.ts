/**
 * @module media.service.ts
 * @description Media service — YouTube search proxy and Cloudinary base64 upload.
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface YouTubeSearchItem {
  id: { videoId?: string; channelId?: string };
  snippet: {
    title: string;
    thumbnails: { medium: { url: string } };
    channelTitle: string;
    channelId?: string;
  };
}

@Injectable()
export class MediaService {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  private parseCommaIds(raw: string | undefined, max: number): Set<string> {
    const set = new Set<string>();
    if (!raw || typeof raw !== 'string') return set;
    let n = 0;
    for (const part of raw.split(',')) {
      const t = part.trim();
      if (!t || n >= max) break;
      set.add(t);
      n++;
    }
    return set;
  }

  private enrichSearchQuery(
    baseQ: string,
    p: { religion?: string; gender?: string; ageGroup?: string },
  ): string {
    const parts: string[] = [baseQ.trim()].filter(Boolean);
    const rel = (p.religion ?? '').trim().toUpperCase();
    if (rel === 'ISLAM' || rel === 'MUSLIM' || rel === 'ISLAMIC') parts.push('Islamic');
    if (rel === 'CHRISTIAN' || rel === 'CHRISTIANITY') parts.push('Christian family-friendly');
    const ag = (p.ageGroup ?? '').trim().toUpperCase();
    if (ag === 'TODDLER') parts.push('toddler');
    if (ag === 'CHILD') parts.push('kids');
    if (ag === 'TEEN') parts.push('teen educational');
    const g = (p.gender ?? '').trim().toUpperCase();
    if (g === 'BOYS' || g === 'GIRLS') parts.push('for kids');
    return parts.join(' ').trim() || baseQ.trim();
  }

  async youtubeSearch(params: {
    q: string;
    lang?: string;
    safeSearch?: string;
    religion?: string;
    gender?: string;
    ageGroup?: string;
    /** Default `video` — use `channel` for channel lookup. */
    resultType?: 'video' | 'channel';
    /** Comma-separated YouTube video IDs to exclude (kid search / parent consistency). */
    blockedVideoIds?: string;
    /** Comma-separated channel IDs (UC…) to exclude from video results. */
    blockedChannelIds?: string;
  }) {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) throw new InternalServerErrorException('YouTube API key not configured');

    const query = this.enrichSearchQuery(params.q, {
      religion: params.religion,
      gender: params.gender,
      ageGroup: params.ageGroup,
    });
    const resultType = params.resultType === 'channel' ? 'channel' : 'video';

    const blockedVideos = this.parseCommaIds(params.blockedVideoIds, 120);
    const blockedChannels = this.parseCommaIds(params.blockedChannelIds, 120);

    const ytParams: Record<string, string> = {
      key: apiKey,
      q: query,
      part: 'snippet',
      type: resultType,
      maxResults: '24',
      relevanceLanguage: params.lang || 'en',
      safeSearch: params.safeSearch || 'strict',
    };
    if (resultType === 'video') {
      ytParams.videoEmbeddable = 'true';
    }

    const { data } = await firstValueFrom(
      this.httpService.get('https://www.googleapis.com/youtube/v3/search', {
        params: ytParams,
      }),
    );

    const items = (data.items || []) as YouTubeSearchItem[];
    if (resultType === 'channel') {
      return items
        .map((item) => {
          const channelId = item.id.channelId ?? item.snippet.channelId ?? '';
          return {
            id: channelId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url,
            channelTitle: item.snippet.channelTitle,
          };
        })
        .filter((row) => row.id.length > 0)
        .filter((row) => !blockedChannels.has(row.id));
    }

    return items
      .map((item) => ({
        id: item.id.videoId,
        channelId: item.snippet.channelId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url,
        channelTitle: item.snippet.channelTitle,
      }))
      .filter((row) => row.id && typeof row.id === 'string')
      .filter((row) => !blockedVideos.has(row.id as string))
      .filter((row) => {
        const ch = row.channelId;
        if (!ch || typeof ch !== 'string') return true;
        return !blockedChannels.has(ch);
      });
  }

  async uploadBase64(data: { base64: string; folder: string; contentType: string }) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary credentials not configured');
    }

    const dataUri = data.base64.startsWith('data:')
      ? data.base64
      : `data:${data.contentType};base64,${data.base64}`;

    const formData = new URLSearchParams();
    formData.append('file', dataUri);
    formData.append('folder', data.folder);
    formData.append('upload_preset', this.config.get<string>('CLOUDINARY_UPLOAD_PRESET', 'unsigned'));

    try {
      const { data: result } = await firstValueFrom(
        this.httpService.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          formData.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            auth: { username: apiKey, password: apiSecret },
          },
        ),
      );
      return { url: (result as { secure_url: string }).secure_url };
    } catch (err: any) {
      throw new BadRequestException(
        `Cloudinary upload failed: ${err?.response?.data?.error?.message || err.message}`,
      );
    }
  }
}
