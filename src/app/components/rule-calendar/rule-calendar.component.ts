import { Component, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, addMonths, subMonths, addWeeks, parseISO, isAfter,
} from 'date-fns';
import { IRule } from 'src/app/db/models/rule';
import { IActivity } from 'src/app/db/models/activity';
import { ActivityService } from 'src/app/services/activity.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { getActivityDurationMinutes } from 'src/app/functions/activity';

type DayStatus = 'none' | 'met' | 'broken';

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: DayStatus;
  hasActivity: boolean;
}


@Component({
  selector: 'app-rule-calendar',
  templateUrl: './rule-calendar.component.html',
  styleUrls: ['./rule-calendar.component.scss'],
  imports: [CommonModule, TranslateModule, IonButton, IonIcon],
})
export class RuleCalendarComponent implements OnInit {
  @Input() rule!: IRule;

  private activityService = inject(ActivityService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private router = inject(Router);

  private allActivities: IActivity[] = [];
  private readonly today = format(new Date(), 'yyyy-MM-dd');

  currentDate = new Date();
  weeks: CalendarDay[][] = [];
  weekStatuses: DayStatus[] = [];
  monthStatus: DayStatus = 'none';
  monthPathD = '';
  clipPathId = '';
  private monthParams: { cs: number; endC: number; endR: number } | null = null;

  @ViewChild('daysSection') daysSectionRef?: ElementRef;
  currentWeekIndex = -1;
  todayColInWeek = 0;
  monthLabel = '';
  uptime: number | null = null;
  streak = 0;
  streakUnitKey = 'TK_CAL_DAYS';

  readonly weekDayKeys = [
    'TK_CAL_MON', 'TK_CAL_TUE', 'TK_CAL_WED',
    'TK_CAL_THU', 'TK_CAL_FRI', 'TK_CAL_SAT', 'TK_CAL_SUN',
  ];

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
    this.clipPathId = 'month-clip-' + Math.random().toString(36).slice(2);
  }

  async ngOnInit() {
    this.loadingService.show('TK_LOADING');
    try {
      this.allActivities = await this.activityService.getByDate(this.rule.startDate, this.today);
      this.computeStats();
      this.buildCalendar();
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      await this.logService.error('RuleCalendarComponent.ngOnInit', e);
    } finally {
      this.loadingService.hide();
    }
  }

  async prevMonth() {
    this.currentDate = subMonths(this.currentDate, 1);
    await this.reloadMonth();
  }

  async nextMonth() {
    this.currentDate = addMonths(this.currentDate, 1);
    await this.reloadMonth();
  }

  private async reloadMonth() {
    this.loadingService.show('TK_LOADING');
    try {
      this.buildCalendar();
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      await this.logService.error('RuleCalendarComponent.reloadMonth', e);
    } finally {
      this.loadingService.hide();
    }
  }

  private buildCalendar() {
    const monthStart = startOfMonth(this.currentDate);
    const monthEnd = endOfMonth(this.currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    this.monthLabel = format(this.currentDate, 'MMMM yyyy');

    const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
    const dayObjects: CalendarDay[] = allDays.map(d => {
      const dateStr = format(d, 'yyyy-MM-dd');
      return {
        date: dateStr,
        dayNumber: d.getDate(),
        isCurrentMonth: d.getMonth() === this.currentDate.getMonth(),
        isToday: dateStr === this.today,
        status: this.getDayStatus(dateStr),
        hasActivity: this.allActivities.some(a => a.date === dateStr && this.activityMatchesRule(a)),
      };
    });

    this.weeks = [];
    for (let i = 0; i < dayObjects.length; i += 7) {
      this.weeks.push(dayObjects.slice(i, i + 7));
    }

    // Locate today in the current view
    this.currentWeekIndex = -1;
    this.todayColInWeek = 0;
    this.weeks.forEach((week, i) => {
      const idx = week.findIndex(d => d.isToday);
      if (idx >= 0) {
        this.currentWeekIndex = i;
        this.todayColInWeek = idx;
      }
    });

    // Week statuses: use today's status for current week, middle-day for others
    this.weekStatuses = this.weeks.map((week, i) => {
      const ref = (i === this.currentWeekIndex)
        ? week[this.todayColInWeek]
        : week[3];
      return ref?.status ?? 'none';
    });

    // Monthly clip path
    this.monthPathD = '';
    this.monthParams = null;
    if (this.rule.period === 'month') {
      const firstCurrentDay = dayObjects.find(d => d.isCurrentMonth && d.status !== 'none');
      this.monthStatus = firstCurrentDay?.status ?? 'none';

      if (this.monthStatus !== 'none') {
        const cs = this.weeks[0].findIndex(d => d.isCurrentMonth);
        const todayNow = new Date();
        const isThisMonth = this.currentDate.getFullYear() === todayNow.getFullYear()
          && this.currentDate.getMonth() === todayNow.getMonth();

        let endC: number;
        let endR: number;

        if (isThisMonth && this.currentWeekIndex >= 0) {
          endR = this.currentWeekIndex;
          endC = this.todayColInWeek;
        } else {
          const lastWeekIdx = this.weeks.length - 1;
          const ceFromEnd = [...this.weeks[lastWeekIdx]].reverse().findIndex(d => d.isCurrentMonth);
          endC = ceFromEnd >= 0 ? 6 - ceFromEnd : 6;
          endR = lastWeekIdx;
        }

        this.monthParams = { cs, endC, endR };
        this.monthPathD = this.buildMonthPath(cs, endC, endR);
        setTimeout(() => this.refreshMonthPath(), 0);
      }
    }
  }

  private refreshMonthPath() {
    if (!this.monthParams || !this.daysSectionRef) return;
    const cellPx = this.daysSectionRef.nativeElement.getBoundingClientRect().width / 7;
    const { cs, endC, endR } = this.monthParams;
    this.monthPathD = this.buildMonthPath(cs, endC, endR, cellPx);
  }

  private buildMonthPath(cs: number, endC: number, endR: number, cellPx = 50): string {
    const r = 20 / cellPx; // (inset:4 + inner-radius:16) / cell_px
    const W = 7;
    const hasTopNotch = cs > 0;
    const hasBotNotch = endC + 1 < W;
    const p: string[] = [];

    if (endR === 0) {
      const x1 = cs, x2 = endC + 1;
      return `M ${x1 + r} 0 L ${x2 - r} 0 A ${r} ${r} 0 0 1 ${x2} ${r}`
        + ` L ${x2} ${1 - r} A ${r} ${r} 0 0 1 ${x2 - r} 1`
        + ` L ${x1 + r} 1 A ${r} ${r} 0 0 1 ${x1} ${1 - r}`
        + ` L ${x1} ${r} A ${r} ${r} 0 0 1 ${x1 + r} 0 Z`;
    }

    // Start: top-left of first occupied cell
    p.push(`M ${(hasTopNotch ? cs : 0) + r} 0`);

    // → top-right corner (convex)
    p.push(`L ${W - r} 0 A ${r} ${r} 0 0 1 ${W} ${r}`);

    if (hasBotNotch) {
      // ↓ right edge to notch row (convex corner at W,endR)
      p.push(`L ${W} ${endR - r} A ${r} ${r} 0 0 1 ${W - r} ${endR}`);
      // ← notch horizontal to endC+1 (concave corner at endC+1,endR)
      p.push(`L ${endC + 1 + r} ${endR} A ${r} ${r} 0 0 0 ${endC + 1} ${endR + r}`);
      // ↓ notch vertical to bottom (convex corner at endC+1,endR+1)
      p.push(`L ${endC + 1} ${endR + 1 - r} A ${r} ${r} 0 0 1 ${endC + 1 - r} ${endR + 1}`);
    } else {
      // ↓ right edge full height (convex corner at W,endR+1)
      p.push(`L ${W} ${endR + 1 - r} A ${r} ${r} 0 0 1 ${W - r} ${endR + 1}`);
    }

    // ← bottom edge to left (convex corner at 0,endR+1)
    p.push(`L ${r} ${endR + 1} A ${r} ${r} 0 0 1 0 ${endR + 1 - r}`);

    if (hasTopNotch) {
      // ↑ left edge to row 1 (convex corner at 0,1)
      p.push(`L 0 ${1 + r} A ${r} ${r} 0 0 1 ${r} 1`);
      // → notch horizontal to cs (concave corner at cs,1)
      p.push(`L ${cs - r} 1 A ${r} ${r} 0 0 0 ${cs} ${1 - r}`);
      // ↑ notch vertical to start (convex corner at cs,0)
      p.push(`L ${cs} ${r} A ${r} ${r} 0 0 1 ${cs + r} 0`);
    } else {
      // ↑ left edge to top-left (convex corner at 0,0)
      p.push(`L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0`);
    }

    p.push('Z');
    return p.join(' ');
  }

  getMonthSvgFill(): string {
    if (this.monthStatus === 'met') return 'rgba(45, 211, 111, 0.22)';
    if (this.monthStatus === 'broken') return 'rgba(235, 68, 90, 0.12)';
    return 'transparent';
  }

private getDayStatus(date: string): DayStatus {
    if (date < this.rule.startDate || date > this.today) return 'none';

    const [periodStart, periodEnd] = this.getPeriodRange(date);
    const periodActivities = this.allActivities.filter(
      a => a.date >= periodStart && a.date <= periodEnd && this.activityMatchesRule(a),
    );

    return this.isMet(this.computeMetric(periodActivities)) ? 'met' : 'broken';
  }

  private computeStats() {
    const completedPeriods = this.getCompletedPeriods();
    const completedStatuses = completedPeriods.map(([start, end]) => {
      const activities = this.allActivities.filter(
        a => a.date >= start && a.date <= end && this.activityMatchesRule(a),
      );
      return this.isMet(this.computeMetric(activities));
    });

    const metCount = completedStatuses.filter(Boolean).length;
    this.uptime = completedStatuses.length > 0
      ? (metCount / completedStatuses.length) * 100
      : null;

    let streak = 0;
    let i = completedStatuses.length - 1;
    while (i >= 0 && completedStatuses[i]) { streak++; i--; }

    const canExtend = completedStatuses.length === 0 || completedStatuses[completedStatuses.length - 1];
    if (canExtend) {
      const [curStart, curEnd] = this.getPeriodRange(this.today);
      const curActivities = this.allActivities.filter(
        a => a.date >= curStart && a.date <= curEnd && this.activityMatchesRule(a),
      );
      if (this.isMet(this.computeMetric(curActivities))) streak++;
    }

    this.streak = streak;
    this.streakUnitKey = this.rule.period === 'week'
      ? 'TK_CAL_WEEKS'
      : this.rule.period === 'month'
        ? 'TK_CAL_MONTHS'
        : 'TK_CAL_DAYS';
  }

  private getCompletedPeriods(): [string, string][] {
    const periods: [string, string][] = [];

    if (this.rule.period === 'day') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const endStr = format(yesterday, 'yyyy-MM-dd');
      if (endStr < this.rule.startDate) return periods;
      for (const d of eachDayOfInterval({ start: parseISO(this.rule.startDate), end: parseISO(endStr) })) {
        const s = format(d, 'yyyy-MM-dd');
        periods.push([s, s]);
      }
    } else if (this.rule.period === 'week') {
      let wStart = startOfWeek(parseISO(this.rule.startDate), { weekStartsOn: 1 });
      const todayWStart = startOfWeek(parseISO(this.today), { weekStartsOn: 1 });
      while (isAfter(todayWStart, wStart)) {
        periods.push([
          format(wStart, 'yyyy-MM-dd'),
          format(endOfWeek(wStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        ]);
        wStart = addWeeks(wStart, 1);
      }
    } else {
      let mStart = startOfMonth(parseISO(this.rule.startDate));
      const todayMStart = startOfMonth(parseISO(this.today));
      while (isAfter(todayMStart, mStart)) {
        periods.push([
          format(mStart, 'yyyy-MM-dd'),
          format(endOfMonth(mStart), 'yyyy-MM-dd'),
        ]);
        mStart = addMonths(mStart, 1);
      }
    }

    return periods;
  }

  private getPeriodRange(date: string): [string, string] {
    if (this.rule.period === 'day') return [date, date];
    const d = parseISO(date);
    if (this.rule.period === 'week') {
      return [
        format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      ];
    }
    return [
      format(startOfMonth(d), 'yyyy-MM-dd'),
      format(endOfMonth(d), 'yyyy-MM-dd'),
    ];
  }

  private activityMatchesRule(activity: IActivity): boolean {
    let subjectMatch = false;
    if (this.rule.subjectType === 'action') {
      subjectMatch = activity.actions.some(a => a.id === this.rule.subjectId);
    } else if (this.rule.subjectType === 'tag') {
      subjectMatch = activity.tags.some(t => t.id === this.rule.subjectId);
    } else {
      subjectMatch = activity.items.some(i => i.id === this.rule.subjectId);
    }
    if (!subjectMatch) return false;
    if (this.rule.startTime && this.rule.endTime) {
      const t = activity.startTime;
      if (t < this.rule.startTime || t > this.rule.endTime) return false;
    }
    return true;
  }

  private computeMetric(activities: IActivity[]): number {
    if (this.rule.metric === 'count') return activities.length;
    if (this.rule.metric === 'totalDuration') {
      return activities.reduce((sum, a) => sum + getActivityDurationMinutes(a), 0);
    }
    return new Set(activities.map(a => a.date)).size;
  }

  private isMet(value: number): boolean {
    return this.rule.operator === '>='
      ? value >= this.rule.value
      : value <= this.rule.value;
  }

  goToDay(date: string) {
    this.router.navigate(['/activity'], { queryParams: { date } });
  }
}
