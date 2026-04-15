import { Controller, Post, Get, Body, Headers, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthTokenPayload } from '@parentingmykid/shared-types';

@ApiTags('Payments & Subscriptions')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'RevenueCat webhook — receives subscription lifecycle events' })
  @Post('revenuecat/webhook')
  handleWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('Authorization') signature: string,
  ): Promise<void> {
    return this.paymentsService.handleRevenueCatWebhook(
      payload as unknown as Parameters<typeof this.paymentsService.handleRevenueCatWebhook>[0],
      signature,
    );
  }

  @ApiOperation({ summary: 'Get current subscription status for a family' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('subscription/:familyId')
  getSubscription(@Param('familyId') familyId: string) {
    return this.paymentsService.getSubscription(familyId);
  }
}
