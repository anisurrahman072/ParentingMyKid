/**
 * @module memory.service.ts
 * @description Family memory gallery — Cloudinary-powered photo/video archive.
 *              Milestones, achievement certificates, trip memories.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum MemoryType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  MILESTONE = 'MILESTONE',
  ACHIEVEMENT = 'ACHIEVEMENT',
  TRIP = 'TRIP',
  DAILY = 'DAILY',
}

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
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async getChildMemories(childId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [memories, total] = await Promise.all([
      this.db.memory.find({ childId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.db.memory.countDocuments({ childId }),
    ]);

    return { memories, total, page, pages: Math.ceil(total / limit) };
  }

  async addMemory(dto: AddMemoryDto) {
    const child = await this.db.childProfile.findOne({ _id: dto.childId }).lean();
    if (!child) throw new NotFoundException('Child not found');

    const memoryType = dto.type as MemoryType;
    const isMilestone =
      memoryType === MemoryType.MILESTONE || dto.category === 'MILESTONE';

    const memory = await this.db.memory.create({
      childId: dto.childId,
      familyId: child.familyId,
      type: memoryType,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      milestone: isMilestone ? dto.caption ?? undefined : undefined,
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
    return this.db.memory.find({ childId, type: MemoryType.MILESTONE }).sort({ createdAt: -1 }).lean();
  }

  async deleteMemory(memoryId: string, childId: string) {
    const memory = await this.db.memory.findOne({ _id: memoryId, childId }).lean();
    if (!memory) return { success: false };

    // Delete from Cloudinary
    if (memory.mediaUrl) {
      const publicId = (memory.mediaUrl as string).split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`pmk/memories/${childId}/${publicId}`).catch(() => {});
    }

    await this.db.memory.findOneAndDelete({ _id: memoryId });
    return { success: true };
  }
}
