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
    const raw =
      this.config.get<string>('EMAIL_FROM')?.trim() || 'noreply@parentingmykid.com';
    if (raw.includes('<') && raw.includes('>')) {
      return raw;
    }
    return `ParentingMyKid <${raw}>`;
  }

  private static plainTextFromHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

    if (message) {
      await this.prisma.siteFeedback.create({
        data: {
          email: dto.email,
          name: dto.name ?? null,
          message,
          country: dto.country ?? null,
          language: dto.language,
          source: dto.source ?? null,
        },
      });
      await this.sendFeedbackThankYou(dto.email, dto.name, dto.language);
      return { ok: true, kind: 'feedback' };
    }

    try {
      await this.prisma.lead.create({
        data: {
          email: dto.email,
          name: dto.name ?? null,
          country: dto.country ?? null,
          language: dto.language,
          source: dto.source ?? null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // New inserts get welcome mail; duplicates used to get nothing — still send confirmation.
        await this.sendAlreadySubscribedEmail(dto.email, dto.name, dto.language);
        throw new ConflictException('This email is already on the list.');
      }
      throw e;
    }

    await this.sendWelcomeEmail(dto.email, dto.name, dto.language);
    return { ok: true, kind: 'lead' };
  }

  private async sendWelcomeEmail(
    email: string,
    name: string | undefined,
    language: 'en' | 'bn',
  ): Promise<void> {
    const greeting =
      language === 'bn'
        ? `আসসালামু আলাইকুম${name ? `, ${name}` : ''}!`
        : `Hi${name ? ` ${name}` : ''}!`;

    const body =
      language === 'bn'
        ? `<p>${greeting}</p><p>ParentingMyKid-এর আপডেট পেতে ধন্যবাদ। আমরা শিগগিরই আপনার সাথে যোগাযোগ করব।</p>`
        : `<p>${greeting}</p><p>Thanks for joining ParentingMyKid. We’ll share warm, practical parenting ideas with you soon.</p>`;

    const html = `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            ${body}
            <p style="color:#64748b;font-size:14px;margin-top:24px;">ParentingMyKid</p>
          </div>
        `;
    await this.sendResendEmail(
      {
        from: this.newsletterFrom(),
        to: email,
        subject:
          language === 'bn'
            ? 'ParentingMyKid — সাবস্ক্রিপশন নিশ্চিত'
            : 'ParentingMyKid — You’re on the list',
        html,
        text: LeadsService.plainTextFromHtml(html),
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
    const body =
      language === 'bn'
        ? `<p>আসসালামু আলাইকুম${name ? `, ${name}` : ''}!</p><p>আপনি ইতিমধ্যে আমাদের তালিকায় আছেন। নতুন টিপস ও আপডেট আপনার ইনবক্সে পৌঁছাবে।</p>`
        : `<p>Hi${name ? ` ${name}` : ''}!</p><p>You’re already on our ParentingMyKid list—we’ll keep sending tips and updates to your inbox.</p>`;

    const html = `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            ${body}
            <p style="color:#64748b;font-size:14px;margin-top:24px;">ParentingMyKid</p>
          </div>
        `;
    await this.sendResendEmail(
      {
        from: this.newsletterFrom(),
        to: email,
        subject:
          language === 'bn'
            ? 'ParentingMyKid — আপনি তালিকায় আছেন'
            : 'ParentingMyKid — You’re already subscribed',
        html,
        text: LeadsService.plainTextFromHtml(html),
      },
      'already-subscribed email',
    );
  }

  private async sendFeedbackThankYou(
    email: string,
    name: string | undefined,
    language: 'en' | 'bn',
  ): Promise<void> {
    const body =
      language === 'bn'
        ? `<p>আসসালামু আলাইকুম${name ? `, ${name}` : ''}!</p><p>আপনার মতামতের জন্য ধন্যবাদ। আমরা শীঘ্রই পড়ব।</p>`
        : `<p>Hi${name ? ` ${name}` : ''}!</p><p>Thanks for your feedback — we read every message.</p>`;

    const html = `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            ${body}
            <p style="color:#64748b;font-size:14px;margin-top:24px;">ParentingMyKid</p>
          </div>
        `;
    await this.sendResendEmail(
      {
        from: this.newsletterFrom(),
        to: email,
        subject:
          language === 'bn'
            ? 'ParentingMyKid — মতামত পেয়েছি'
            : 'ParentingMyKid — We received your message',
        html,
        text: LeadsService.plainTextFromHtml(html),
      },
      'feedback thank-you email',
    );
  }
}
