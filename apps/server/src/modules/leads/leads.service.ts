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

/** Match verified sender domain in Resend (same family as weekly reports). */
const FROM_NEWSLETTER = 'ParentingMyKid <reports@parentingmykid.com>';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly resend: Resend | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('RESEND_API_KEY');
    this.resend = key ? new Resend(key) : null;
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
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — skipping welcome email');
      return;
    }

    const greeting =
      language === 'bn'
        ? `আসসালামু আলাইকুম${name ? `, ${name}` : ''}!`
        : `Hi${name ? ` ${name}` : ''}!`;

    const body =
      language === 'bn'
        ? `<p>${greeting}</p><p>ParentingMyKid-এর আপডেট পেতে ধন্যবাদ। আমরা শিগগিরই আপনার সাথে যোগাযোগ করব।</p>`
        : `<p>${greeting}</p><p>Thanks for joining ParentingMyKid. We’ll share warm, practical parenting ideas with you soon.</p>`;

    try {
      await this.resend.emails.send({
        from: FROM_NEWSLETTER,
        to: email,
        subject:
          language === 'bn'
            ? 'ParentingMyKid — সাবস্ক্রিপশন নিশ্চিত'
            : 'ParentingMyKid — You’re on the list',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            ${body}
            <p style="color:#64748b;font-size:14px;margin-top:24px;">ParentingMyKid</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Resend welcome email failed for ${email}`, err);
    }
  }

  private async sendFeedbackThankYou(
    email: string,
    name: string | undefined,
    language: 'en' | 'bn',
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — skipping feedback thank-you email');
      return;
    }

    const body =
      language === 'bn'
        ? `<p>আসসালামু আলাইকুম${name ? `, ${name}` : ''}!</p><p>আপনার মতামতের জন্য ধন্যবাদ। আমরা শীঘ্রই পড়ব।</p>`
        : `<p>Hi${name ? ` ${name}` : ''}!</p><p>Thanks for your feedback — we read every message.</p>`;

    try {
      await this.resend.emails.send({
        from: FROM_NEWSLETTER,
        to: email,
        subject:
          language === 'bn'
            ? 'ParentingMyKid — মতামত পেয়েছি'
            : 'ParentingMyKid — We received your message',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            ${body}
            <p style="color:#64748b;font-size:14px;margin-top:24px;">ParentingMyKid</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Resend feedback email failed for ${email}`, err);
    }
  }
}
