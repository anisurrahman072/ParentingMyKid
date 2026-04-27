import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthTokenPayload } from '@parentingmykid/shared-types';
import { FriendsService } from './friends.service';
import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class InviteBody {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromChildId!: string;
}

class AcceptBody {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toChildId!: string;
}

class ApproveBody {
  @ApiProperty()
  @IsBoolean()
  approve!: boolean;
}

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @ApiOperation({ summary: 'Create friend invite (child)' })
  @Post('invite')
  createInvite(@CurrentUser() user: AuthTokenPayload, @Body() body: InviteBody) {
    return this.friends.createInvite(user, body.fromChildId);
  }

  @ApiOperation({ summary: 'Accept friend invite (child)' })
  @Post('accept')
  accept(@CurrentUser() user: AuthTokenPayload, @Body() body: AcceptBody) {
    return this.friends.acceptInvite(user, body.inviteCode, body.toChildId);
  }

  @ApiOperation({ summary: 'Parent approves or rejects' })
  @Post(':familyId/approve/:inviteId')
  approve(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
    @Param('inviteId') inviteId: string,
    @Body() body: ApproveBody,
  ) {
    return this.friends.parentApprove(user, familyId, inviteId, body.approve);
  }

  @ApiOperation({ summary: 'Pending friend invites for family (parent)' })
  @Get('pending/:familyId')
  pending(@CurrentUser() user: AuthTokenPayload, @Param('familyId') familyId: string) {
    return this.friends.listPendingForFamily(user, familyId);
  }

  @ApiOperation({ summary: 'List friends for a child' })
  @Get('list/:childId')
  list(@CurrentUser() user: AuthTokenPayload, @Param('childId') childId: string) {
    return this.friends.listFriendsForChild(user, childId);
  }
}
