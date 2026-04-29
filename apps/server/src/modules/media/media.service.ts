/**
 * @module media.service.ts
 * @description Media service — YouTube search proxy and Cloudinary base64 upload.
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: { medium: { url: string } };
    channelTitle: string;
  };
}

@Injectable()
export class MediaService {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async youtubeSearch(params: {
    q: string;
    lang?: string;
    safeSearch?: string;
    religion?: string;
    gender?: string;
    ageGroup?: string;
  }) {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) throw new InternalServerErrorException('YouTube API key not configured');

    const query = params.q;
    const { data } = await firstValueFrom(
      this.httpService.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: apiKey,
          q: query,
          part: 'snippet',
          type: 'video',
          maxResults: 20,
          relevanceLanguage: params.lang || 'en',
          safeSearch: params.safeSearch || 'strict',
          videoEmbeddable: 'true',
        },
      }),
    );

    const items = (data.items || []) as YouTubeSearchItem[];
    return items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelTitle: item.snippet.channelTitle,
    }));
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
