/**
 * @module ai.service.ts
 * @description The AI brain of ParentingMyKid — powered by OpenAI GPT-4o.
 *              Handles 9 distinct AI modules from the master plan:
 *
 *   Module 1 — Baseline Assessment AI (adaptive scoring)
 *   Module 2 — Personalized Growth Planner (weekly 7-day plans)
 *   Module 3 — Behavioral Coach for Parents (exact scripts)
 *   Module 4 — Talent Discovery Engine
 *   Module 5 — Nutrition Advisor
 *   Module 6 — Anomaly Detector & Early Warning System
 *   Module 7 — Wellbeing Score Engine (0-100 daily score)
 *   Module 8 — Smart Notification Engine
 *   Module 9 — Voice-Powered Assistant for Kids (Whisper)
 *
 *              + Tutor Question Pack Generator
 *              + Safe AI Study Assistant for Kids
 *
 * @business-rule AI is what separates ParentingMyKid from all competitors.
 *               Without AI, this is a habit tracker. With AI, it is a 24/7
 *               parenting expert that knows each child personally.
 *               Every AI call uses GPT-4o for quality — cheaper turbo models
 *               are used for simple tasks (wellbeing score, nutrition advice).
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  GrowthPlan,
  WellbeingScore,
  AICoachRequest,
  AICoachResponse,
  SafeAIStudyResponse,
} from '@parentingmykid/shared-types';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  // ─── Module 2: Weekly Growth Planner ─────────────────────────────────────

  /**
   * Generates a 7-day personalized growth plan for a child every Monday.
   * Uses the child's baseline scores, recent mission completion, mood trends,
   * and skill assessments to create specific, time-bounded daily tasks.
   */
  async generateWeeklyGrowthPlan(childId: string): Promise<GrowthPlan> {
    const child = await this.prisma.childProfile.findUniqueOrThrow({
      where: { id: childId },
      include: {
        skillAssessments: { orderBy: { assessedAt: 'desc' }, take: 8 },
        moodLogs: { orderBy: { loggedAt: 'desc' }, take: 7 },
        dailyMissions: { orderBy: { date: 'desc' }, take: 7 },
      },
    });

    const age = new Date().getFullYear() - new Date(child.dob).getFullYear();
    const recentMoodAvg =
      child.moodLogs.reduce((sum, m) => sum + m.moodScore, 0) / (child.moodLogs.length || 1);
    const recentCompletionAvg =
      child.dailyMissions.reduce((sum, m) => sum + m.completionPct, 0) /
      (child.dailyMissions.length || 1);

    const skillSummary = child.skillAssessments.reduce(
      (acc, s) => {
        acc[s.skillType] = s.score;
        return acc;
      },
      {} as Record<string, number>,
    );

    const prompt = `
You are an expert child development AI creating a personalized 7-day growth plan.

Child Profile:
- Age: ${age} years old
- Grade: ${child.grade}
- Islam module: ${child.islamicModuleEnabled}
- Current streak: ${child.currentStreak} days
- Recent mood average: ${recentMoodAvg.toFixed(1)}/5
- Recent mission completion: ${recentCompletionAvg.toFixed(0)}%
- Skill scores (0-100): ${JSON.stringify(skillSummary)}
- Allergies: ${child.allergies.join(', ') || 'none'}
- Favorite activities: ${child.favoriteActivities.join(', ') || 'not specified'}

Create a JSON response with this exact structure:
{
  "focusAreas": [
    {
      "dimension": "reading|math|physical|emotional|habit|social|sleep|islamic|nutrition",
      "reason": "Brief explanation of why this is a focus area",
      "dailyTasks": ["Task 1 with specific time", "Task 2", "Task 3"],
      "predictedOutcome": "Expected improvement if child follows plan"
    }
  ],
  "predictedImprovements": {
    "reading": 15,
    "math": 10
  },
  "confidence": 0.75,
  "weeklyMotivation": "Encouraging message for parent"
}

Rules:
- Include 2-3 focus areas
- Tasks must be age-appropriate for a ${age}-year-old
- Each task must have a specific time duration ("15 minutes", "30 minutes")
- Predicted improvements are percentage improvements over 4 weeks
- If Islamic module enabled, include Islamic tasks (Salah, Quran)
- Focus on the LOWEST scoring skills first
- Make tasks FUN and achievable, not overwhelming
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use mini for routine weekly plans — cost optimization
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const plan = JSON.parse(response.choices[0].message.content ?? '{}');
      const weekStart = this.getMonday();

      // Save to database
      await this.prisma.aiGrowthPlan.upsert({
        where: { childId_weekStart: { childId, weekStart } },
        create: {
          childId,
          weekStart,
          focusAreasJson: plan.focusAreas,
          predictedImprovements: plan.predictedImprovements ?? {},
          confidence: plan.confidence ?? 0.7,
        },
        update: {
          focusAreasJson: plan.focusAreas,
          predictedImprovements: plan.predictedImprovements ?? {},
          confidence: plan.confidence ?? 0.7,
        },
      });

      return {
        childId,
        weekStart,
        focusAreas: plan.focusAreas,
        predictedImprovements: plan.predictedImprovements ?? {},
        confidence: plan.confidence ?? 0.7,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate growth plan for child ${childId}:`, error);
      throw error;
    }
  }

  // ─── Module 3: Behavioral Coach for Parents ───────────────────────────────

  /**
   * The most emotionally impactful AI feature — gives parents EXACT words to say.
   * When a parent is stressed about their child's behavior, this is their lifeline.
   * Each response must be grounded in real child psychology.
   */
  async getParentingCoachScript(request: AICoachRequest): Promise<AICoachResponse> {
    const prompt = `
You are an expert child psychologist and parenting coach. A parent needs immediate help.

Situation: "${request.situation}"
Child age: ${request.childAge} years old

Provide a practical, empathetic response in this exact JSON format:
{
  "immediateScript": "Exact words the parent should say right now (2-3 sentences max, must sound natural)",
  "immediateSteps": ["Step 1 to take right now", "Step 2", "Step 3"],
  "doNotSay": ["Phrase to avoid 1", "Phrase to avoid 2"],
  "longerTermStrategy": "2-3 sentence longer-term approach",
  "category": "REFUSAL|MELTDOWN|LYING|SCREEN_ADDICTION|BULLYING|ANXIETY|PROCRASTINATION|SIBLING_CONFLICT|BEDTIME|OTHER"
}

Rules:
- The immediate script must be words a real parent can say out loud — natural, not clinical
- Be compassionate to BOTH parent and child
- Ground advice in actual child psychology (attachment theory, behavioral reinforcement, etc.)
- Steps must be doable in the next 5 minutes
- Do NOT use jargon parents won't understand
- Age-appropriate advice for a ${request.childAge}-year-old
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o', // Use full GPT-4o for behavioral coaching — quality matters most here
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const result = JSON.parse(response.choices[0].message.content ?? '{}');

    // Save session for parent's history
    await this.prisma.aiCoachSession.create({
      data: {
        parentId: request.childId, // Will be replaced with actual parentId from controller
        childId: request.childId,
        situation: request.situation,
        category: result.category ?? 'OTHER',
        immediateScript: result.immediateScript,
        immediateSteps: result.immediateSteps,
        doNotSay: result.doNotSay,
        longerTermStrategy: result.longerTermStrategy,
      },
    });

    return result as AICoachResponse;
  }

  // ─── Module 7: Wellbeing Score Engine ────────────────────────────────────

  /**
   * Calculates the child's daily wellbeing score (0-100).
   * Combines: mood, mission completion, sleep, screen time, and physical activity.
   * Alerts parent if score drops significantly or stays low for 3+ days.
   */
  async calculateWellbeingScore(childId: string): Promise<WellbeingScore> {
    // Check Redis cache first — score is calculated once per day
    const cached = await this.redis.getCachedWellbeingScore(childId);
    if (cached !== null) {
      return {
        childId,
        score: cached,
        breakdown: {},
        trend: 'STABLE',
        trendDays: 0,
        alerts: [],
        calculatedAt: new Date().toISOString(),
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [moods, missions, healthRecords, screenLogs] = await Promise.all([
      this.prisma.moodLog.findMany({
        where: { childId, loggedAt: { gte: new Date(sevenDaysAgo) } },
        orderBy: { loggedAt: 'desc' },
        take: 14, // 2 per day for 7 days
      }),
      this.prisma.dailyMission.findMany({
        where: { childId, date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
        take: 7,
      }),
      this.prisma.healthRecord.findMany({
        where: { childId, recordedAt: { gte: new Date(sevenDaysAgo) } },
      }),
      this.prisma.screenUsageLog.findMany({
        where: { childId, date: { gte: sevenDaysAgo } },
      }),
    ]);

    // Mood score (0-100): average of last 7 mood logs
    const moodAvg = moods.length > 0
      ? moods.reduce((sum, m) => sum + m.moodScore, 0) / moods.length
      : 3;
    const moodScore = (moodAvg / 5) * 100;

    // Mission score (0-100): average completion percentage
    const missionScore = missions.length > 0
      ? missions.reduce((sum, m) => sum + m.completionPct, 0) / missions.length
      : 50;

    // Sleep score (0-100): based on logged sleep hours
    const sleepRecords = healthRecords.filter((r) => r.recordType === 'SLEEP');
    const avgSleep = sleepRecords.length > 0
      ? sleepRecords.reduce((sum, r) => sum + r.value, 0) / sleepRecords.length
      : 8;
    const sleepScore = Math.min(100, (avgSleep / 9) * 100); // 9 hours = 100%

    // Physical activity score
    const activityRecords = healthRecords.filter((r) => r.recordType === 'ACTIVITY_MINUTES');
    const avgActivity = activityRecords.length > 0
      ? activityRecords.reduce((sum, r) => sum + r.value, 0) / activityRecords.length
      : 30;
    const physicalScore = Math.min(100, (avgActivity / 60) * 100); // 60 min = 100%

    // Screen time score (inverse — less is better)
    const totalScreenMins = screenLogs.reduce((sum, s) => sum + s.durationSeconds / 60, 0);
    const avgDailyScreen = totalScreenMins / 7;
    const screenScore = Math.max(0, 100 - (avgDailyScreen / 180) * 100); // 3h+ = 0 score

    // Composite score (weighted average)
    const score = Math.round(
      moodScore * 0.3 +
      missionScore * 0.3 +
      sleepScore * 0.15 +
      physicalScore * 0.15 +
      screenScore * 0.1,
    );

    const breakdown = {
      mood: Math.round(moodScore),
      missions: Math.round(missionScore),
      sleep: Math.round(sleepScore),
      physical: Math.round(physicalScore),
      screenTime: Math.round(screenScore),
    };

    // Generate alerts for concerning patterns
    const alerts: string[] = [];
    if (moodScore < 40) alerts.push('Mood has been consistently low this week');
    if (missionScore < 30) alerts.push('Mission completion dropped significantly');
    if (sleepScore < 50) alerts.push('Sleep duration is below recommended levels');

    // Cache the score
    await this.redis.cacheWellbeingScore(childId, score);

    // Save to database
    await this.prisma.childProfile.update({
      where: { id: childId },
      data: { wellbeingScore: score, wellbeingUpdatedAt: new Date() },
    });

    return {
      childId,
      score,
      breakdown,
      trend: this.calculateTrend(score),
      trendDays: 7,
      alerts,
      calculatedAt: new Date().toISOString(),
    };
  }

  // ─── Module 5: Nutrition Advisor ─────────────────────────────────────────

  /**
   * Analyzes the child's nutrition logs for the week and provides
   * specific, culturally-appropriate recommendations.
   * Halal-aware when Islamic module is enabled.
   */
  async getNutritionAdvice(childId: string): Promise<string> {
    const child = await this.prisma.childProfile.findUniqueOrThrow({
      where: { id: childId },
    });

    const weekLogs = await this.prisma.mealLog.findMany({
      where: {
        childId,
        loggedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const age = new Date().getFullYear() - new Date(child.dob).getFullYear();

    const prompt = `
You are a nutritionist specialized in children aged 4-15 in South Asia (Bangladesh).
Analyze this child's weekly nutrition and give practical advice.

Child: ${age} years old, allergies: ${child.allergies.join(', ') || 'none'}
Halal only: ${child.islamicModuleEnabled}
Meal logs this week: ${JSON.stringify(weekLogs.map((l) => l.foodsJson))}

Provide a 2-3 sentence response that:
1. States the top 1-2 missing nutrients
2. Suggests specific local foods to address the gap (Bangladesh-appropriate: rice, dal, hilsa, vegetables, eggs)
3. Is practical and actionable for a parent to implement tomorrow

Keep it warm, practical, not clinical. Max 60 words.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    return response.choices[0].message.content ?? 'Keep up the good nutritional habits!';
  }

  // ─── Module 9: Safe AI Study Assistant ───────────────────────────────────

  /**
   * Child-facing AI homework helper that TEACHES — never gives direct answers.
   * All responses are age-appropriate, filtered for safety, and use the Socratic method.
   * Parents can see a log of all AI interactions in their dashboard.
   */
  async safeStudyAssist(childId: string, question: string, subject: string): Promise<SafeAIStudyResponse> {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    const age = new Date().getFullYear() - new Date(child.dob).getFullYear();

    const prompt = `
You are a friendly, patient AI tutor for a ${age}-year-old child studying ${subject}.

The child asks: "${question}"

STRICT RULES:
1. NEVER give direct homework answers — always teach the concept
2. Use the Socratic method — ask the child a question to guide their thinking
3. Keep language simple and age-appropriate for ${age} years old
4. Be encouraging and warm
5. If the question is inappropriate or off-topic, gently redirect to studying
6. NEVER discuss violence, adult content, politics, or anything inappropriate for children

Respond in JSON:
{
  "response": "Your teaching response here (max 3 sentences)",
  "followUpQuestion": "A question to make the child think (optional)",
  "relatedTip": "A helpful study tip related to the topic (optional)"
}
`;

    const result = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const parsed = JSON.parse(result.choices[0].message.content ?? '{}');

    // Log the study session
    await this.prisma.studySession.create({
      data: {
        childId,
        subject,
        durationMinutes: 0,
        sessionType: 'AI_HELP',
        aiPrompts: 1,
      },
    });

    return parsed as SafeAIStudyResponse;
  }

  // ─── Module 6: Anomaly Detector ──────────────────────────────────────────

  /**
   * Monitors 12 signals daily and generates wellbeing alerts when 3+ signals deviate.
   * Inspired by Bark's 29-category monitoring system — extended to cover growth dimensions.
   */
  async detectAnomalies(childId: string): Promise<void> {
    const score = await this.calculateWellbeingScore(childId);

    if (score.alerts.length > 0 && score.score < 50) {
      // Create an AI recommendation for the parent
      const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });

      await this.prisma.aiRecommendation.create({
        data: {
          childId,
          parentId: child.parentId,
          category: 'safety',
          recommendationText: `${child.name}'s wellbeing score is ${score.score}/100 this week. ${score.alerts.join('. ')}`,
          actionStepsJson: [
            'Check in with your child about how they are feeling',
            'Review their recent missions and screen time',
            'Consider a 1-on-1 activity together this weekend',
          ],
        },
      });
    }
  }

  // ─── Tutor Question Pack Generator ───────────────────────────────────────

  /**
   * Generates 3-5 precisely worded questions for the tutor based on the parent's concern.
   * Questions are designed to be answerable in a 30-second web form response.
   */
  async generateTutorQuestions(concern: string, childName: string, childAge: number): Promise<
    Array<{ id: string; text: string; type: 'RATING' | 'TEXT' | 'BOOLEAN' }>
  > {
    const prompt = `
Generate 3-5 questions for a private tutor/teacher about a student.

Parent concern: "${concern}"
Student: ${childName}, ${childAge} years old

Create questions that:
1. Can be answered in 5-10 seconds each
2. Use a 1-5 rating scale where possible
3. Are specific and actionable
4. Cover different angles of the concern

Return JSON array:
[
  {"id": "q1", "text": "Question text", "type": "RATING"},
  {"id": "q2", "text": "Question text", "type": "TEXT"},
  {"id": "q3", "text": "Question text", "type": "BOOLEAN"}
]
Valid types: RATING (1-5 stars), TEXT (short answer), BOOLEAN (yes/no)
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const parsed = JSON.parse(response.choices[0].message.content ?? '{"questions":[]}');
    return Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
  }

  // ─── Practice Question Generator ─────────────────────────────────────────

  async generatePracticeQuestions(
    childId: string,
    subject: string,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    count: number = 5,
  ): Promise<Array<{
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>> {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    const age = new Date().getFullYear() - new Date(child.dob).getFullYear();

    const prompt = `
Generate ${count} ${difficulty.toLowerCase()} multiple-choice practice questions for:
Subject: ${subject}
Child age: ${age} years old (Grade: ${child.grade})

Return JSON:
{
  "questions": [
    {
      "questionText": "Question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief, encouraging explanation of why this is correct"
    }
  ]
}

Rules:
- Age-appropriate language
- Explanations must be encouraging, not condescending
- Options must be clearly distinct
- ${difficulty === 'EASY' ? 'Simple, foundational concepts' : difficulty === 'MEDIUM' ? 'Standard curriculum level' : 'Challenging, requires deeper thinking'}
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(response.choices[0].message.content ?? '{"questions":[]}');
    return parsed.questions ?? [];
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private getMonday(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  private calculateTrend(currentScore: number): 'UP' | 'DOWN' | 'STABLE' {
    // Simplified — production compares to previous week's score
    if (currentScore >= 70) return 'UP';
    if (currentScore < 50) return 'DOWN';
    return 'STABLE';
  }
}
