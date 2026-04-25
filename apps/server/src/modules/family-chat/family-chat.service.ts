import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthTokenPayload } from '@parentingmykid/shared-types';
import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendChatMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  familyId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

@Injectable()
export class FamilyChatService {
  constructor(private readonly prisma: PrismaService) {}

  private assertFamilyAccess(user: AuthTokenPayload, familyId: string): void {
    if (!user.familyIds?.includes(familyId)) {
      throw new ForbiddenException('Not a member of this family');
    }
  }

  async sendMessage(user: AuthTokenPayload, dto: SendChatMessageDto) {
    this.assertFamilyAccess(user, dto.familyId);

    const u = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { name: true },
    });
    const userName = u?.name ?? 'User';

    const message = await this.prisma.familyChatMessage.create({
      data: {
        familyId: dto.familyId,
        senderId: user.sub,
        senderName: userName,
        senderRole: user.role,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
      },
    });

    return {
      id: message.id,
      familyId: message.familyId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      content: message.content,
      mediaUrl: message.mediaUrl ?? undefined,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async listMessages(
    user: AuthTokenPayload,
    familyId: string,
    limit = 50,
    before?: string,
  ) {
    this.assertFamilyAccess(user, familyId);

    const where: { familyId: string; createdAt?: { lt: Date } } = { familyId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const rows = await this.prisma.familyChatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    const messages = rows.map((m) => ({
      id: m.id,
      familyId: m.familyId,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      content: m.content,
      mediaUrl: m.mediaUrl ?? undefined,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      messages: messages.reverse(),
      nextCursor: messages.length > 0 ? messages[0].createdAt : undefined,
    };
  }

  async deleteMessage(user: AuthTokenPayload, messageId: string): Promise<void> {
    const msg = await this.prisma.familyChatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    this.assertFamilyAccess(user, msg.familyId);

    const isParent = user.role === 'PARENT';
    const isOwn = msg.senderId === user.sub;
    if (!isOwn && !isParent) {
      throw new ForbiddenException('Cannot delete this message');
    }

    await this.prisma.familyChatMessage.delete({ where: { id: messageId } });
  }
}
