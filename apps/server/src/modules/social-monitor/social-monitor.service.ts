/**
 * @module social-monitor.service.ts
 * @description AI-powered social media monitoring service.
 *
 *              Scanning approach:
 *              - Parent installs companion app on child's device
 *              - App reads notification content + message previews (with consent)
 *              - Content is sent to this service for AI analysis
 *              - OpenAI scans against 29+ harmful content categories
 *              - Critical findings trigger immediate parent push notification
 *
 *              Categories scanned (Bark-equivalent):
 *              Self-harm, suicidal ideation, depression, anxiety, cyberbullying,
 *              sexual content, violence, drug references, alcohol, predatory behaviour,
 *              profanity, hate speech, self-harm methods, eating disorders,
 *              relationship abuse, online grooming, radicalization, weapons,
 *              body image, loneliness/social isolation, LGBTQ+ issues, grief/loss,
 *              identity crisis, academic stress, peer pressure, racism,
 *              pornography, gambling, extremist content
 *
 * @compliance All data is processed server-side and never stored as raw text.
 *             Only AI analysis results + severity scores are persisted.
 *             Parents must explicitly enable monitoring and children are informed.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AlertCategory, AlertSeverity as DbAlertSeverity } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@parentingmykid/shared-types';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Stored in ContentFilterEvent.reason as JSON for social-scan events. */
interface SocialScanReasonPayload {
  kind: 'SOCIAL_SCAN';
  platform: string;
  categories: string[];
  severity: string;
  summary?: string;
  confidence?: number;
}

function parseSocialScanPayload(reason: string): SocialScanReasonPayload | null {
  try {
    const parsed = JSON.parse(reason) as SocialScanReasonPayload;
    return parsed?.kind === 'SOCIAL_SCAN' ? parsed : null;
  } catch {
    return null;
  }
}

export class ScanContentDto {
  @ApiProperty({ description: 'Child profile ID' })
  @IsString()
  childId!: string;

  @ApiProperty({ description: 'Source platform' })
  @IsString()
  platform!: string; // 'WHATSAPP' | 'INSTAGRAM' | 'TIKTOK' | 'SNAPCHAT' | 'X' | 'SMS' | 'EMAIL' | 'UNKNOWN'

  @ApiProperty({ description: 'Content to scan (message, post, caption)' })
  @IsString()
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  context?: string; // Thread/conversation context snippet
}

// Categories that always trigger immediate parent notification
const CRITICAL_CATEGORIES = [
  'self_harm',
  'suicidal_ideation',
  'predatory_contact',
  'grooming',
  'sexual_solicitation',
  'violence_threat',
];

const CONTENT_SCAN_PROMPT = `You are a child safety AI. Analyze this message for harmful content categories.

Message: {content}
Platform: {platform}
Context: {context}

Scan for these 29 categories:
1. self_harm - references to cutting, hurting oneself
2. suicidal_ideation - thoughts of suicide or wanting to die  
3. depression - severe low mood, hopelessness
4. anxiety - severe anxiety, panic
5. cyberbullying - being bullied, targeted harassment
6. sexual_content - age-inappropriate sexual content
7. violence - violent threats or descriptions
8. drugs - drug use or acquisition
9. alcohol - underage drinking
10. predatory_contact - adult trying to groom/contact inappropriately
11. grooming - manipulation to gain trust for exploitation
12. profanity - severe or repeated profanity
13. hate_speech - racist, sexist, homophobic content
14. eating_disorder - anorexia, bulimia references
15. relationship_abuse - controlling or abusive relationship signs
16. radicalization - extremist ideology
17. weapons - references to acquiring weapons
18. loneliness - severe isolation, no friends
19. body_image - severe body image issues
20. academic_stress - extreme pressure, failure anxiety
21. peer_pressure - being pressured into harmful activities
22. pornography - explicit adult content
23. gambling - online gambling
24. identity_crisis - severe identity confusion
25. grief - unprocessed grief/loss
26. racism - experiencing racism
27. lgbtq_distress - distress related to identity not being accepted
28. extremist_content - extremist propaganda
29. missing_child_risk - references to running away or being taken

Respond with JSON:
{
  "detected": boolean,
  "categories": ["category_key"],
  "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": 0.0-1.0,
  "summary": "brief description if detected",
  "recommendedAction": "monitor" | "alert_parent" | "immediate_intervention",
  "falsePositiveLikely": boolean
}`;

@Injectable()
export class SocialMonitorService {
  private readonly logger = new Logger(SocialMonitorService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get('OPENAI_API_KEY') });
  }

  // ─── Scan Content ─────────────────────────────────────────────────────────

  /**
   * Main entry point — called by the child's device companion app.
   * Analyzes content and triggers alerts if harmful content detected.
   */
  async scanContent(dto: ScanContentDto) {
    const child = await this.prisma.childProfile.findUniqueOrThrow({
      where: { id: dto.childId },
    });

    // Skip scan if monitoring is not enabled for this child
    if (!child.socialMonitoringEnabled) {
      return { scanned: false, reason: 'monitoring_disabled' };
    }

    // Use gpt-4o-mini for cost efficiency on high-volume content scanning
    const prompt = CONTENT_SCAN_PROMPT
      .replace('{content}', dto.content)
      .replace('{platform}', dto.platform)
      .replace('{context}', dto.context ?? 'None provided');

    let scanResult: any;
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      scanResult = JSON.parse(completion.choices[0].message.content ?? '{}');
    } catch (err) {
      this.logger.error('OpenAI scan failed:', err);
      return { scanned: false, error: 'ai_unavailable' };
    }

    const reasonPayload: SocialScanReasonPayload = {
      kind: 'SOCIAL_SCAN',
      platform: dto.platform,
      categories: scanResult.categories ?? [],
      severity: scanResult.severity ?? 'NONE',
      summary: scanResult.summary,
      confidence: scanResult.confidence ?? 0,
    };

    await this.prisma.contentFilterEvent.create({
      data: {
        childId: dto.childId,
        blockedUrl: `app://social-scan/${encodeURIComponent(dto.platform)}`,
        reason: JSON.stringify(reasonPayload),
      },
    });

    // If harmful content detected, create a safety alert
    if (scanResult.detected && scanResult.severity !== 'NONE' && !scanResult.falsePositiveLikely) {
      const isCritical = scanResult.categories?.some((c: string) => CRITICAL_CATEGORIES.includes(c));
      const severity = isCritical ? DbAlertSeverity.CRITICAL : this.mapSeverity(scanResult.severity);

      await this.prisma.safetyAlert.create({
        data: {
          childId: dto.childId,
          category: AlertCategory.STRANGER_CONTACT,
          severity,
          title: `Content concern on ${dto.platform}`,
          description: scanResult.summary ?? 'Potentially harmful content detected',
          evidenceSnippet:
            scanResult.categories?.length ? `Categories: ${scanResult.categories.join(', ')}` : null,
          platform: dto.platform,
          isRead: false,
        },
      });

      // Notify parent
      await this.notifications.sendToUser(child.parentId, {
        type: NotificationType.SAFETY_ALERT,
        title: isCritical
          ? `🚨 URGENT: Safety concern detected on ${child.name}'s ${dto.platform}`
          : `⚠️ Content concern on ${child.name}'s ${dto.platform}`,
        body: scanResult.summary ?? `Potential ${scanResult.categories?.[0]?.replace(/_/g, ' ')} detected`,
        data: {
          screen: 'safety',
          childId: dto.childId,
          platform: dto.platform,
          isCritical,
        },
        priority: isCritical ? 'high' : 'default',
      });

      this.logger.warn(
        `Safety alert created for child ${dto.childId}: ${scanResult.severity} on ${dto.platform}`,
      );
    }

    return {
      scanned: true,
      detected: scanResult.detected,
      severity: scanResult.severity,
      actionRequired: scanResult.recommendedAction === 'immediate_intervention',
    };
  }

  // ─── Get Monitoring Summary ────────────────────────────────────────────────

  async getMonitoringSummary(childId: string, days = 7) {
    const since = new Date(Date.now() - days * 86400000);

    const events = await this.prisma.contentFilterEvent.findMany({
      where: {
        childId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });

    const total = events.length;
    const flagged = events.filter((e) => {
      const p = parseSocialScanPayload(e.reason);
      return p && p.severity !== 'NONE';
    }).length;

    // Category breakdown
    const categoryCount: Record<string, number> = {};
    for (const event of events) {
      const p = parseSocialScanPayload(event.reason);
      for (const cat of p?.categories ?? []) {
        categoryCount[cat] = (categoryCount[cat] ?? 0) + 1;
      }
    }

    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    const platformBreakdown: Record<string, number> = {};
    for (const event of events) {
      const p = parseSocialScanPayload(event.reason);
      const platform = p?.platform ?? 'unknown';
      platformBreakdown[platform] = (platformBreakdown[platform] ?? 0) + 1;
    }

    return {
      period: `Last ${days} days`,
      totalScanned: total,
      flagged,
      safeRate: total > 0 ? Math.round(((total - flagged) / total) * 100) : 100,
      topCategories,
      platformBreakdown,
      recentEvents: events.slice(0, 10),
    };
  }

  // ─── Enable/Disable Monitoring ────────────────────────────────────────────

  async setMonitoring(childId: string, enabled: boolean) {
    await this.prisma.childProfile.update({
      where: { id: childId },
      data: { socialMonitoringEnabled: enabled },
    });
    return { success: true, monitoringEnabled: enabled };
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private mapSeverity(severity: string): DbAlertSeverity {
    const map: Record<string, DbAlertSeverity> = {
      LOW: DbAlertSeverity.LOW,
      MEDIUM: DbAlertSeverity.MEDIUM,
      HIGH: DbAlertSeverity.HIGH,
      CRITICAL: DbAlertSeverity.CRITICAL,
    };
    return map[severity] ?? DbAlertSeverity.MEDIUM;
  }
}
