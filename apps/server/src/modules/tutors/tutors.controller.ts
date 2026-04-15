import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TutorsService, InviteTutorDto, SubmitTutorResponseDto } from './tutors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, AuthTokenPayload } from '@parentingmykid/shared-types';

@ApiTags('Tutors')
@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @ApiOperation({ summary: 'Parent invites a tutor with AI-generated question pack' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  @Post('invite')
  inviteTutor(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: InviteTutorDto,
  ) {
    return this.tutorsService.inviteTutor(user.sub, dto);
  }

  @ApiOperation({ summary: 'Public — tutor gets their web form via email link (no auth)' })
  @Get('respond/:token')
  getTutorForm(@Param('token') token: string) {
    return this.tutorsService.getTutorForm(token);
  }

  @ApiOperation({ summary: 'Public — tutor submits their responses via web form' })
  @Post('respond/:token')
  submitTutorResponse(
    @Param('token') token: string,
    @Body() dto: SubmitTutorResponseDto,
  ) {
    return this.tutorsService.submitTutorResponse(token, dto);
  }
}
