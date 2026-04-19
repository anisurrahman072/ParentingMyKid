/**
 * @module leads.service.ts
 * @description Marketing-site lead capture (newsletter) and visitor feedback.
 *              Uses Resend for confirmation emails when RESEND_API_KEY is set.
 */

import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';

import { PrismaService } from '../../database/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import {
  buildAlreadySubscribedEmail,
  buildFeedbackThankYouEmail,
  buildWelcomeNewsletterEmail,
} from './leads-email-templates';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly resend: Resend | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('RESEND_API_KEY')?.trim();
    this.resend = key ? new Resend(key) : null;
    if (this.resend) {
      this.logger.log('Resend is configured (transactional emails enabled).');
    } else {
      this.logger.warn(
        'RESEND_API_KEY is missing or empty — newsletter/feedback confirmation emails are disabled.',
      );
    }
  }

  /**
   * Use EMAIL_FROM from `apps/server/.env` (same as tutors/analytics). Must match a verified
   * sender/domain in Resend. Do not hardcode a different address (e.g. reports@ vs noreply@)
   * unless that exact address is verified — otherwise Resend returns `error` and nothing is sent.
   */
  private newsletterFrom(): string {
    const raw = this.config.get<string>('EMAIL_FROM')?.trim() || 'noreply@parentingmykid.com';
    if (raw.includes('<') && raw.includes('>')) {
      return raw;
    }
    return `ParentingMyKid <${raw}>`;
  }

  /**
   * Public marketing site origin (no trailing slash). Used for email links and `/logo.png`.
   * Set `PUBLIC_WEB_URL` in production so images load; defaults to www.parentingmykid.com.
   */
  private publicMarketingSiteUrl(): string {
    const raw =
      this.config.get<string>('PUBLIC_WEB_URL')?.trim() ||
      this.config.get<string>('WEB_PUBLIC_URL')?.trim() ||
      '';
    return raw ? raw.replace(/\/+$/, '') : 'https://www.parentingmykid.com';
  }

  /** Resend v4 returns `{ data, error }` and does not throw on API errors — must check `error`. */
  private async sendResendEmail(
    payload: { from: string; to: string; subject: string; html: string; text: string },
    logLabel: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not set — skipping ${logLabel}`);
      return;
    }
    const result = await this.resend.emails.send(payload);
    if (result.error) {
      this.logger.error(
        `${logLabel} Resend API error for ${payload.to}: ${JSON.stringify(result.error)}`,
      );
      return;
    }
    this.logger.log(`${logLabel} sent id=${result.data?.id ?? '?'} → ${payload.to}`);
  }

  async create(dto: CreateLeadDto): Promise<{ ok: true; kind: 'lead' | 'feedback' }> {
    const message = dto.message?.trim();
    const emailNorm = dto.email.trim().toLowerCase();

    if (message) {
      await this.prisma.siteFeedback.create({
        data: {
          email: emailNorm,
          name: dto.name ?? null,
          message,
          country: dto.country ?? null,
          language: dto.language,
          source: dto.source ?? null,
        },
      });
      await this.sendFeedbackThankYou(emailNorm, dto.name, dto.language);
      return { ok: true, kind: 'feedback' };
    }

    const existing = await this.prisma.lead.findFirst({
      where: {
        email: { equals: emailNorm, mode: 'insensitive' },
      },
    });
    if (existing) {
      await this.sendAlreadySubscribedEmail(emailNorm, dto.name, dto.language);
      throw new ConflictException('This email is already on the list.');
    }

    try {
      await this.prisma.lead.create({
        data: {
          email: emailNorm,
          name: dto.name ?? null,
          country: dto.country ?? null,
          language: dto.language,
          source: dto.source ?? null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // `Lead` only has @@unique on `email` — races or legacy casing can land here after a missed findFirst.
        this.logger.warn(
          `Lead unique violation for normalized email=${emailNorm} meta=${JSON.stringify(e.meta)}`,
        );
        await this.sendAlreadySubscribedEmail(emailNorm, dto.name, dto.language);
        throw new ConflictException('This email is already on the list.');
      }
      throw e;
    }

    await this.sendWelcomeEmail(emailNorm, dto.name, dto.language);
    return { ok: true, kind: 'lead' };
  }

  private async sendWelcomeEmail(
    email: string,
    name: string | undefined,
    language: 'en' | 'bn',
  ): Promise<void> {
    const { subject, html, text } = buildWelcomeNewsletterEmail(
      language,
      name,
      this.publicMarketingSiteUrl(),
    );
    await this.sendResendEmail(
      {
        from: this.newsletterFrom(),
        to: email,
        subject,
        html,
        text,
      },
      'welcome email',
    );
  }

  /** Sent when the address is already in DB (409) so subscribers still get inbox proof. */
  private async sendAlreadySubscribedEmail(
    email: string,
    name: string | undefined,
    language: 'en' | 'bn',
  ): Promise<void> {
    const { subject, html, text } = buildAlreadySubscribedEmail(
      language,
      name,
      this.publicMarketingSiteUrl(),
    );
    await this.sendResendEmail(
      {
        from: this.newsletterFrom(),
        to: email,
        subject,
        html,
        text,
      },
      'already-subscribed email',
    );
  }

  private async sendFeedbackThankYou(
    email: string,
    name: string | undefined,
    language: 'en' | 'bn',
  ): Promise<void> {
    const { subject, html, text } = buildFeedbackThankYouEmail(
      language,
      name,
      this.publicMarketingSiteUrl(),
    );
    await this.sendResendEmail(
      {
        from: this.newsletterFrom(),
        to: email,
        subject,
        html,
        text,
      },
      'feedback thank-you email',
    );
  }
}
