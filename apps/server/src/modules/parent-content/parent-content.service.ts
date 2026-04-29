/**
 * @module parent-content.service.ts
 * @description Service for managing curated content (articles, videos, audio, images)
 *              that parents push to their family or specific children.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateParentContentDto) {
    return this.prisma.parentContent.create({
      data: {
        familyId: dto.familyId,
        childId: dto.childId,
        type: dto.type as any,
        title: dto.title,
        body: dto.body,
        mediaUrl: dto.mediaUrl,
      },
    });
  }

  async findByFamily(familyId: string) {
    return this.prisma.parentContent.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByChild(childId: string) {
    const child = await this.prisma.childProfile.findUnique({
      where: { id: childId },
      select: { familyId: true },
    });
    if (!child) throw new NotFoundException('Child not found');

    return this.prisma.parentContent.findMany({
      where: {
        familyId: child.familyId,
        OR: [{ childId }, { childId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string, isRead: boolean) {
    return this.prisma.parentContent.update({
      where: { id },
      data: { isRead },
    });
  }

  async remove(id: string) {
    return this.prisma.parentContent.delete({ where: { id } });
  }
}
