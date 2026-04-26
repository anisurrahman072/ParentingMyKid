import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthTokenPayload, MyFamilyListItem, UserRole } from '@parentingmykid/shared-types';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';

@ApiTags('families')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('families')
export class FamiliesController {
  constructor(private readonly service: FamiliesService) {}

  @ApiOperation({ summary: 'List all households the parent belongs to (names, members, children)' })
  @Roles(UserRole.PARENT)
  @Get()
  listMyFamilies(@CurrentUser() user: AuthTokenPayload): Promise<MyFamilyListItem[]> {
    return this.service.listMyFamilies(user.sub);
  }

  @ApiOperation({ summary: 'Create a new household; parent becomes primary (for a second home, co-parent, etc.)' })
  @Roles(UserRole.PARENT)
  @Post()
  createMyFamily(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateFamilyDto,
  ): Promise<MyFamilyListItem> {
    return this.service.createMyFamily(user.sub, dto.name);
  }
}
