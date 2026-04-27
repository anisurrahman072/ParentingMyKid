import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, type AuthTokenPayload } from '@parentingmykid/shared-types';
import { CalendarService, type FamilyCalendarEventInstance } from './calendar.service';
import { CreateFamilyCalendarEventDto, UpdateFamilyCalendarEventDto } from './dto/calendar-event.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('families')
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @ApiOperation({ summary: 'List family schedule instances in a time range (expands weekly repeats)' })
  @ApiQuery({ name: 'from', required: true, description: 'ISO 8601 start' })
  @ApiQuery({ name: 'to', required: true, description: 'ISO 8601 end' })
  @Roles(UserRole.PARENT)
  @Get(':familyId/calendar/events')
  list(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<FamilyCalendarEventInstance[]> {
    return this.service.listInRange(user, familyId, from, to);
  }

  @ApiOperation({ summary: 'Create a calendar event (one-off or weekly)' })
  @Roles(UserRole.PARENT)
  @Post(':familyId/calendar/events')
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
    @Body() dto: CreateFamilyCalendarEventDto,
  ): Promise<FamilyCalendarEventInstance> {
    return this.service.create(user, familyId, dto);
  }

  @ApiOperation({ summary: 'Update a calendar event' })
  @Roles(UserRole.PARENT)
  @Patch(':familyId/calendar/events/:eventId')
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateFamilyCalendarEventDto,
  ): Promise<FamilyCalendarEventInstance> {
    return this.service.update(user, familyId, eventId, dto);
  }

  @ApiOperation({ summary: 'Delete a calendar event (including its weekly series)' })
  @Roles(UserRole.PARENT)
  @Delete(':familyId/calendar/events/:eventId')
  remove(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ ok: true }> {
    return this.service.remove(user, familyId, eventId);
  }
}
