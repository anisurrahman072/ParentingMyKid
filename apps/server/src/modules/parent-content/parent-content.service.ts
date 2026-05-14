/**
 * @module parent-content.service.ts
 * @description Service for managing curated content (articles, videos, audio, images)
 *              that parents push to their family or specific children.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ContentTypeEnum {
  ARTICLE = 'ARTICLE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
}

export class CreateParentContentDto {
  @ApiProperty()
  @IsString()
  familyId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  childId?: string;

  @ApiProperty({ enum: ContentTypeEnum })
  @IsEnum(ContentTypeEnum)
  type!: ContentTypeEnum;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

@Injectable()
export class ParentContentService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateParentContentDto) {
    return this.db.parentContent.create({
      familyId: dto.familyId,
      childId: dto.childId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      mediaUrl: dto.mediaUrl,
    });
  }

  async findByFamily(familyId: string) {
    return this.db.parentContent.find({ familyId }).sort({ createdAt: -1 }).lean();
  }

  async findByChild(childId: string) {
    const child = await this.db.childProfile.findOne({ _id: childId }).select('familyId').lean();
    if (!child) throw new NotFoundException('Child not found');

    return this.db.parentContent
      .find({
        familyId: child.familyId,
        $or: [{ childId }, { childId: null }],
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async markRead(id: string, isRead: boolean) {
    return this.db.parentContent.findOneAndUpdate(
      { _id: id },
      { $set: { isRead } },
      { new: true },
    ).lean();
  }

  async remove(id: string) {
    return this.db.parentContent.findOneAndDelete({ _id: id });
  }
}
