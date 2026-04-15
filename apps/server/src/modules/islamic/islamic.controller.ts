import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IslamicService, LogSalahDto, LogQuranDto, ZakatCalculatorDto } from './islamic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthTokenPayload } from '@parentingmykid/shared-types';

@ApiTags('Islamic Module')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('islamic')
export class IslamicController {
  constructor(private readonly islamicService: IslamicService) {}

  @ApiOperation({ summary: "Get today's Islamic content: prayer times, dua, Quran goal" })
  @Get('daily-content')
  getDailyContent(
    @Query('childId') childId: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
  ) {
    return this.islamicService.getDailyContent(
      childId,
      lat ? parseFloat(lat) : undefined,
      lon ? parseFloat(lon) : undefined,
    );
  }

  @ApiOperation({ summary: "Log completion of a Salah (prayer)" })
  @Post('salah/log')
  logSalah(@Body() dto: LogSalahDto): Promise<void> {
    return this.islamicService.logSalah(dto);
  }

  @ApiOperation({ summary: "Get today's Salah completion status for a child" })
  @Get('salah/today/:childId')
  getTodaySalah(@Param('childId') childId: string) {
    return this.islamicService.getTodaySalahStatus(childId);
  }

  @ApiOperation({ summary: "Log Quran reading session" })
  @Post('quran/log')
  logQuran(@Body() dto: LogQuranDto): Promise<void> {
    return this.islamicService.logQuranReading(dto);
  }

  @ApiOperation({ summary: "Calculate Zakat obligation for parent" })
  @Post('zakat/calculate')
  calculateZakat(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: ZakatCalculatorDto,
  ) {
    return this.islamicService.calculateZakat(user.sub, dto);
  }
}
