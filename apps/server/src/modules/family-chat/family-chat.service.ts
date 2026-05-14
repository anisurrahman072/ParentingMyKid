import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
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
  constructor(private readonly db: DatabaseService) {}

  private assertFamilyAccess(user: AuthTokenPayload, familyId: string): void {
    if (!user.familyIds?.includes(familyId)) {
      throw new ForbiddenException('Not a member of this family');
    }
  }

  async sendMessage(user: AuthTokenPayload, dto: SendChatMessageDto) {
    this.assertFamilyAccess(user, dto.familyId);

    const u = await this.db.user.findById(user.sub).select('name').lean();
    const userName = (u?.name as string | undefined) ?? 'User';

    const message = await this.db.familyChatMessage.create({
      familyId: dto.familyId,
      senderId: user.sub,
      senderName: userName,
      senderRole: user.role,
      content: dto.content,
      mediaUrl: dto.mediaUrl,
    });

    return {
      id: String(message._id),
      familyId: message.familyId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      content: message.content,
      mediaUrl: message.mediaUrl ?? undefined,
      createdAt: (message as unknown as { createdAt: Date }).createdAt.toISOString(),
    };
  }

  async listMessages(user: AuthTokenPayload, familyId: string, limit = 50, before?: string) {
    this.assertFamilyAccess(user, familyId);

    const query: Record<string, unknown> = { familyId };
    if (before) query.createdAt = { $lt: new Date(before) };

    const rows = await this.db.familyChatMessage
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .lean();

    const messages = rows.map((m) => ({
      id: String(m._id),
      familyId: m.familyId,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      content: m.content,
      mediaUrl: m.mediaUrl ?? undefined,
      createdAt: (m as unknown as { createdAt: Date }).createdAt.toISOString(),
    }));

    return {
      messages: messages.reverse(),
      nextCursor: messages.length > 0 ? messages[0].createdAt : undefined,
    };
  }

  async deleteMessage(user: AuthTokenPayload, messageId: string): Promise<void> {
    const msg = await this.db.familyChatMessage.findById(messageId).lean();
    if (!msg) throw new NotFoundException('Message not found');
    this.assertFamilyAccess(user, msg.familyId);

    const isParent = user.role === 'PARENT';
    const isOwn = msg.senderId === user.sub;
    if (!isOwn && !isParent) {
      throw new ForbiddenException('Cannot delete this message');
    }

    await this.db.familyChatMessage.findByIdAndDelete(messageId);
  }
}
