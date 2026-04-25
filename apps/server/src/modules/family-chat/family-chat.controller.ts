import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FamilyChatService, SendChatMessageDto } from './family-chat.service';
import { AuthTokenPayload } from '@parentingmykid/shared-types';

@ApiTags('Family Chat')
@Controller('family-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FamilyChatController {
  constructor(private readonly familyChat: FamilyChatService) {}

  @ApiOperation({ summary: 'Send a family chat message' })
  @Post('send')
  async send(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.familyChat.sendMessage(user, dto);
  }

  @ApiOperation({ summary: 'List family chat messages' })
  @Get(':familyId')
  async list(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.familyChat.listMessages(
      user,
      familyId,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
  }

  @ApiOperation({ summary: 'Delete a chat message' })
  @Delete('message/:messageId')
  async remove(
    @CurrentUser() user: AuthTokenPayload,
    @Param('messageId') messageId: string,
  ) {
    await this.familyChat.deleteMessage(user, messageId);
  }
}
