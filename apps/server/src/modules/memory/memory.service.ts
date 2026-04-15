/**
 * @module memory.service.ts
 * @description Family memory gallery — Cloudinary-powered photo/video archive.
 *              Milestones, achievement certificates, trip memories.
 */

import { Injectable } from '@nestjs/common';
import { MemoryType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemoryDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty()
  @IsString()
  type!: string; // 'PHOTO' | 'VIDEO'

  @ApiProperty()
  @IsString()
  mediaUrl!: string; // Cloudinary URL after client-side upload

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string; // 'ACHIEVEMENT' | 'TRIP' | 'MILESTONE' | 'DAILY'
}

@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async getChildMemories(childId: string, page = 1, limit = 30) {
    const [memories, total] = await Promise.all([
      this.prisma.memory.findMany({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.memory.count({ where: { childId } }),
    ]);

    return { memories, total, page, pages: Math.ceil(total / limit) };
  }

  async addMemory(dto: AddMemoryDto) {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: dto.childId } });

    const memoryType = dto.type as MemoryType;
    const isMilestone =
      memoryType === MemoryType.MILESTONE || dto.category === 'MILESTONE';

    const memory = await this.prisma.memory.create({
      data: {
        childId: dto.childId,
        familyId: child.familyId,
        type: memoryType,
        mediaUrl: dto.mediaUrl,
        caption: dto.caption,
        milestone: isMilestone ? dto.caption ?? undefined : undefined,
      },
    });

    return { memory };
  }

  /**
   * Generate a Cloudinary upload signature for client-side direct uploads.
   * Client uploads directly to Cloudinary (faster, no server bandwidth cost).
   * Then calls addMemory with the returned URL.
   */
  async getUploadSignature(childId: string) {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `pmk/memories/${childId}`;

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      this.config.get('CLOUDINARY_API_SECRET')!,
    );

    return {
      signature,
      timestamp,
      folder,
      cloudName: this.config.get('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.config.get('CLOUDINARY_API_KEY'),
    };
  }

  async getMilestones(childId: string) {
    return this.prisma.memory.findMany({
      where: { childId, type: MemoryType.MILESTONE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteMemory(memoryId: string, childId: string) {
    const memory = await this.prisma.memory.findFirst({ where: { id: memoryId, childId } });
    if (!memory) return { success: false };

    // Delete from Cloudinary
    if (memory.mediaUrl) {
      const publicId = memory.mediaUrl.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`pmk/memories/${childId}/${publicId}`).catch(() => {});
    }

    await this.prisma.memory.delete({ where: { id: memoryId } });
    return { success: true };
  }
}
