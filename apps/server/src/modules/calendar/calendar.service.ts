import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addMinutes, eachDayOfInterval, isEqual, parseISO } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { AuthTokenPayload, NotificationType } from '@parentingmykid/shared-types';
import type { FamilyCalendarEvent } from '@prisma/client';
import { CreateFamilyCalendarEventDto, UpdateFamilyCalendarEventDto } from './dto/calendar-event.dto';
import { NotificationsService } from '../notifications/notifications.service';

function sameSortedIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export type FamilyCalendarEventInstance = {
  id: string;
  baseEventId: string;
  familyId: string;
  childId: string | null;
  title: string;
  type: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  reminderDays: number | null;
  recurrenceKind: 'NONE' | 'WEEKLY';
  recurrenceByWeekday: number | null;
  recurrenceByWeekdays: number[];
  assignees: Array<{
    kind: 'user' | 'child';
    id: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  createdBy: string;
  createdAt: string;
  isRecurringInstance: boolean;
};

function intervalOverlapsIncl(
  a0: Date,
  a1: Date,
  b0: Date,
  b1: Date,
): boolean {
  return a0.getTime() <= b1.getTime() && a1.getTime() >= b0.getTime();
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Weekly list instances use `baseId#yyyy-mm-dd`; DB rows use `baseId` only. */
  private resolveStoredEventId(eventId: string): string {
    const i = eventId.indexOf('#');
    return i >= 0 ? eventId.slice(0, i) : eventId;
  }

  private normalizedWeeklyDays(
    row: Pick<FamilyCalendarEvent, 'recurrenceKind' | 'recurrenceByWeekday' | 'recurrenceByWeekdays' | 'startAt'>,
  ): number[] {
    if (row.recurrenceKind !== 'WEEKLY') return [];
    const fromArr = row.recurrenceByWeekdays?.length
      ? [...new Set(row.recurrenceByWeekdays)].sort((a, b) => a - b)
      : [];
    if (fromArr.length > 0) return fromArr;
    const w = row.recurrenceByWeekday ?? row.startAt.getUTCDay();
    return [w];
  }

  private assertFamilyAccess(user: AuthTokenPayload, familyId: string): void {
    if (!user.familyIds?.includes(familyId)) {
      throw new ForbiddenException('Not a member of this family');
    }
  }

  private async assertChildInFamily(
    familyId: string,
    childId: string | null | undefined,
  ): Promise<void> {
    if (childId == null || childId === '') return;
    const child = await this.prisma.childProfile.findFirst({
      where: { id: childId, familyId },
      select: { id: true },
    });
    if (!child) {
      throw new BadRequestException('Child does not belong to this family');
    }
  }

  private async assertAssigneesInFamily(
    familyId: string,
    userIds: string[],
    childIds: string[],
  ): Promise<void> {
    if (userIds.length > 0) {
      const n = await this.prisma.familyMember.count({
        where: { familyId, userId: { in: userIds } },
      });
      if (n !== userIds.length) {
        throw new BadRequestException('One or more assignee users are not in this family');
      }
    }
    if (childIds.length > 0) {
      const n = await this.prisma.childProfile.count({
        where: { familyId, id: { in: childIds } },
      });
      if (n !== childIds.length) {
        throw new BadRequestException('One or more assignee children are not in this family');
      }
    }
  }

  private async hydrateAssignees(
    instances: FamilyCalendarEventInstance[],
    rows: FamilyCalendarEvent[],
  ): Promise<void> {
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const userIds = new Set<string>();
    const childIds = new Set<string>();
    for (const row of rows) {
      userIds.add(row.createdBy);
      for (const id of row.assigneeUserIds ?? []) userIds.add(id);
      for (const id of row.assigneeChildIds ?? []) childIds.add(id);
      if (row.childId) childIds.add(row.childId);
    }
    const [users, children] = await Promise.all([
      userIds.size > 0
        ? this.prisma.user.findMany({
            where: { id: { in: [...userIds] } },
            select: { id: true, name: true, avatarUrl: true },
          })
        : Promise.resolve([]),
      childIds.size > 0
        ? this.prisma.childProfile.findMany({
            where: { id: { in: [...childIds] } },
            select: { id: true, name: true, avatarUrl: true },
          })
        : Promise.resolve([]),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const childMap = new Map(children.map((c) => [c.id, c]));

    for (const inst of instances) {
      const row = rowById.get(inst.baseEventId);
      if (!row) {
        inst.assignees = [];
        continue;
      }
      const assignees: FamilyCalendarEventInstance['assignees'] = [];
      for (const uid of [...new Set(row.assigneeUserIds ?? [])]) {
        const u = userMap.get(uid);
        if (u) {
          assignees.push({
            kind: 'user',
            id: uid,
            displayName: u.name,
            avatarUrl: u.avatarUrl ?? null,
          });
        }
      }
      const childSet = new Set(row.assigneeChildIds ?? []);
      if (row.childId) childSet.add(row.childId);
      for (const cid of childSet) {
        const c = childMap.get(cid);
        if (c) {
          assignees.push({
            kind: 'child',
            id: cid,
            displayName: c.name,
            avatarUrl: c.avatarUrl ?? null,
          });
        }
      }
      if (assignees.length === 0) {
        const u = userMap.get(row.createdBy);
        if (u) {
          assignees.push({
            kind: 'user',
            id: row.createdBy,
            displayName: u.name,
            avatarUrl: u.avatarUrl ?? null,
          });
        }
      }
      inst.assignees = assignees;
    }
  }

  private toInstance(
    row: FamilyCalendarEvent,
    instanceStart: Date,
    instanceEnd: Date | null,
  ): FamilyCalendarEventInstance {
    const baseId = row.id;
    const startIso = instanceStart.toISOString();
    const isVirtual = row.recurrenceKind === 'WEEKLY' && !isEqual(instanceStart, row.startAt);
    const dayKey = startIso.slice(0, 10);
    const displayId = row.recurrenceKind === 'WEEKLY' ? `${baseId}#${dayKey}` : baseId;
    const weeklyDays = this.normalizedWeeklyDays(row);
    return {
      id: displayId,
      baseEventId: baseId,
      familyId: row.familyId,
      childId: row.childId,
      title: row.title,
      type: row.type,
      description: row.description,
      location: row.location,
      startAt: startIso,
      endAt: instanceEnd?.toISOString() ?? null,
      reminderDays: row.reminderDays,
      recurrenceKind: row.recurrenceKind as 'NONE' | 'WEEKLY',
      recurrenceByWeekday: weeklyDays[0] ?? row.recurrenceByWeekday,
      recurrenceByWeekdays: weeklyDays,
      assignees: [],
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      isRecurringInstance: isVirtual,
    };
  }

  private expandInRange(
    row: FamilyCalendarEvent,
    from: Date,
    to: Date,
    out: FamilyCalendarEventInstance[],
  ): void {
    if (row.recurrenceKind === 'WEEKLY') {
      const anchor = row.startAt;
      const wdays = this.normalizedWeeklyDays(row);
      const h = anchor.getUTCHours();
      const m = anchor.getUTCMinutes();
      const sec = anchor.getUTCSeconds();
      const ms = anchor.getUTCMilliseconds();
      const endOff = row.endAt != null ? row.endAt.getTime() - row.startAt.getTime() : 0;
      for (const wday of wdays) {
        for (const d of eachDayOfInterval({ start: from, end: to })) {
          if (d.getUTCDay() !== wday) continue;
          const inst = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, sec, ms),
          );
          const instEnd = endOff > 0 ? new Date(inst.getTime() + endOff) : inst;
          if (!intervalOverlapsIncl(from, to, inst, instEnd)) {
            continue;
          }
          out.push(this.toInstance(row, inst, endOff > 0 ? new Date(inst.getTime() + endOff) : null));
        }
      }
      return;
    }

    const start = row.startAt;
    const effEnd = row.endAt ?? addMinutes(start, 60);
    if (intervalOverlapsIncl(from, to, start, effEnd)) {
      out.push(this.toInstance(row, start, row.endAt));
    }
  }

  async listInRange(
    user: AuthTokenPayload,
    familyId: string,
    fromStr: string,
    toStr: string,
  ): Promise<FamilyCalendarEventInstance[]> {
    this.assertFamilyAccess(user, familyId);
    const from = parseISO(fromStr);
    const to = parseISO(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid from or to (use ISO 8601)');
    }
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be before to');
    }

    const rows = await this.prisma.familyCalendarEvent.findMany({
      where: { familyId },
      orderBy: { startAt: 'asc' },
    });

    const out: FamilyCalendarEventInstance[] = [];
    for (const row of rows) {
      this.expandInRange(row, from, to, out);
    }
    out.sort((a, b) => a.startAt.localeCompare(b.startAt));
    await this.hydrateAssignees(out, rows);
    return out;
  }

  async create(
    user: AuthTokenPayload,
    familyId: string,
    dto: CreateFamilyCalendarEventDto,
  ): Promise<FamilyCalendarEventInstance> {
    this.assertFamilyAccess(user, familyId);
    const kind = dto.recurrenceKind ?? 'NONE';
    const weeklyFromDto =
      dto.recurrenceByWeekdays != null && dto.recurrenceByWeekdays.length > 0
        ? [...new Set(dto.recurrenceByWeekdays)].sort((a, b) => a - b)
        : dto.recurrenceByWeekday != null
          ? [dto.recurrenceByWeekday]
          : [];
    if (kind === 'WEEKLY' && weeklyFromDto.length === 0) {
      throw new BadRequestException(
        'recurrenceByWeekdays (non-empty) or recurrenceByWeekday is required for WEEKLY events',
      );
    }
    if (kind === 'NONE' && dto.recurrenceByWeekday != null) {
      throw new BadRequestException('recurrenceByWeekday only applies to WEEKLY events');
    }
    if (kind === 'NONE' && (dto.recurrenceByWeekdays?.length ?? 0) > 0) {
      throw new BadRequestException('recurrenceByWeekdays only applies to WEEKLY events');
    }

    const startAt = parseISO(dto.startAt);
    const endAt = dto.endAt ? parseISO(dto.endAt) : null;
    if (endAt && endAt < startAt) {
      throw new BadRequestException('endAt must be on or after startAt');
    }

    const weeklyDays = kind === 'WEEKLY' ? (weeklyFromDto.length > 0 ? weeklyFromDto : [startAt.getUTCDay()]) : [];
    const loc = dto.location?.trim();
    const assigneeUserIds = [...new Set(dto.assigneeUserIds ?? [])];
    const assigneeChildIds = [...new Set(dto.assigneeChildIds ?? [])];
    await this.assertAssigneesInFamily(familyId, assigneeUserIds, assigneeChildIds);
    const legacyChildId = dto.childId ?? (assigneeChildIds.length === 1 ? assigneeChildIds[0]! : null);
    await this.assertChildInFamily(familyId, legacyChildId);
    const created = await this.prisma.familyCalendarEvent.create({
      data: {
        familyId,
        childId: legacyChildId,
        title: dto.title,
        type: dto.type,
        description: dto.description,
        location: loc && loc.length > 0 ? loc : null,
        startAt,
        endAt: endAt ?? null,
        reminderDays: dto.reminderDays,
        recurrenceKind: kind,
        recurrenceByWeekday: kind === 'WEEKLY' ? weeklyDays[0]! : null,
        recurrenceByWeekdays: kind === 'WEEKLY' ? weeklyDays : [],
        assigneeUserIds,
        assigneeChildIds,
        createdBy: user.sub,
      },
    });

    const inst = this.toInstance(created, created.startAt, created.endAt);
    await this.hydrateAssignees([inst], [created]);
    return inst;
  }

  async update(
    user: AuthTokenPayload,
    familyId: string,
    eventId: string,
    dto: UpdateFamilyCalendarEventDto,
  ): Promise<FamilyCalendarEventInstance> {
    this.assertFamilyAccess(user, familyId);
    const rowId = this.resolveStoredEventId(eventId);
    const existing = await this.prisma.familyCalendarEvent.findFirst({
      where: { id: rowId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (dto.childId !== undefined) {
      await this.assertChildInFamily(familyId, dto.childId ?? null);
    }
    if (dto.assigneeUserIds !== undefined) {
      await this.assertAssigneesInFamily(familyId, [...new Set(dto.assigneeUserIds)], []);
    }
    if (dto.assigneeChildIds !== undefined) {
      await this.assertAssigneesInFamily(familyId, [], [...new Set(dto.assigneeChildIds)]);
    }

    const startAt = dto.startAt != null ? parseISO(dto.startAt) : existing.startAt;
    const endAt = dto.endAt !== undefined ? (dto.endAt != null ? parseISO(dto.endAt) : null) : existing.endAt;
    if (endAt && endAt < startAt) {
      throw new BadRequestException('endAt must be on or after startAt');
    }

    const nextKind = dto.recurrenceKind ?? (existing.recurrenceKind as 'NONE' | 'WEEKLY');

    type WeeklyPatch = { recurrenceByWeekday: number | null; recurrenceByWeekdays: number[] };
    let weeklyPatch: WeeklyPatch | undefined;
    if (nextKind === 'NONE') {
      weeklyPatch = { recurrenceByWeekday: null, recurrenceByWeekdays: [] };
    } else if (nextKind === 'WEEKLY') {
      let newDays: number[] | undefined;
      if (dto.recurrenceByWeekdays != null) {
        newDays = [...new Set(dto.recurrenceByWeekdays)].sort((a, b) => a - b);
      } else if (dto.recurrenceByWeekday !== undefined) {
        newDays =
          dto.recurrenceByWeekday == null ? [] : [dto.recurrenceByWeekday];
      } else if (dto.recurrenceKind === 'WEEKLY' && existing.recurrenceKind !== 'WEEKLY') {
        newDays = [startAt.getUTCDay()];
      }
      if (newDays !== undefined) {
        if (newDays.length === 0) newDays = [startAt.getUTCDay()];
        weeklyPatch = { recurrenceByWeekday: newDays[0]!, recurrenceByWeekdays: newDays };
      }
    }

    const assigneesChanged =
      (dto.assigneeUserIds !== undefined &&
        !sameSortedIds([...(existing.assigneeUserIds ?? [])], [...(dto.assigneeUserIds ?? [])])) ||
      (dto.assigneeChildIds !== undefined &&
        !sameSortedIds([...(existing.assigneeChildIds ?? [])], [...(dto.assigneeChildIds ?? [])]));

    const updated = await this.prisma.familyCalendarEvent.update({
      where: { id: rowId },
      data: {
        title: dto.title,
        type: dto.type,
        description: dto.description,
        location:
          dto.location === undefined
            ? undefined
            : dto.location === null || dto.location.trim() === ''
              ? null
              : dto.location.trim(),
        startAt: dto.startAt != null ? parseISO(dto.startAt) : undefined,
        endAt: dto.endAt !== undefined ? (dto.endAt != null ? parseISO(dto.endAt) : null) : undefined,
        childId: dto.childId,
        reminderDays: dto.reminderDays,
        recurrenceKind: dto.recurrenceKind,
        ...(weeklyPatch ?? {}),
        ...(dto.assigneeUserIds !== undefined
          ? { assigneeUserIds: [...new Set(dto.assigneeUserIds)] }
          : {}),
        ...(dto.assigneeChildIds !== undefined
          ? { assigneeChildIds: [...new Set(dto.assigneeChildIds)] }
          : {}),
      },
    });

    const inst = this.toInstance(updated, updated.startAt, updated.endAt);
    await this.hydrateAssignees([inst], [updated]);

    if (assigneesChanged) {
      const notifyUsers = [...new Set(updated.assigneeUserIds ?? [])].filter((id) => id !== user.sub);
      for (const uid of notifyUsers) {
        await this.notifications.sendToUser(
          uid,
          {
            type: NotificationType.CALENDAR_PLAN_UPDATED,
            title: 'Family schedule updated',
            body: `${updated.title} — you're included on this plan. Open Schedule to view.`,
            data: {
              familyId,
              eventId: updated.id,
              notificationType: NotificationType.CALENDAR_PLAN_UPDATED,
            },
            priority: 'high',
          },
          { skipDedup: true },
        );
      }
    }

    return inst;
  }

  async remove(
    user: AuthTokenPayload,
    familyId: string,
    eventId: string,
  ): Promise<{ ok: true }> {
    this.assertFamilyAccess(user, familyId);
    const rowId = this.resolveStoredEventId(eventId);
    const existing = await this.prisma.familyCalendarEvent.findFirst({
      where: { id: rowId, familyId },
    });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    await this.prisma.familyCalendarEvent.delete({ where: { id: rowId } });
    return { ok: true as const };
  }
}
