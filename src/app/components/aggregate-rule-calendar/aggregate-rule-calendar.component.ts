import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, parseISO } from 'date-fns';
import { IRule, RulePeriod } from 'src/app/db/models/rule';
import { IActivity } from 'src/app/db/models/activity';
import { getActivityDurationMinutes } from 'src/app/functions/activity';

type DayStatus = 'none' | 'met' | 'broken';

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  /** Period-level status — used for week row / SVG and daily day-cell coloring. */
  periodStatus: DayStatus;
  /** Activity-based status for week/month — met = >= rule activity, broken = <= / value=0. */
  activityStatus: DayStatus;
}

@Component({
  selector: 'app-aggregate-rule-calendar',
  templateUrl: './aggregate-rule-calendar.component.html',
  styleUrls: [
    '../rule-calendar/rule-calendar.component.scss',
    './aggregate-rule-calendar.component.scss',
  ],
  imports: [CommonModule, TranslateModule, IonButton, IonIcon],
})
export class AggregateRuleCalendarComponent implements OnChanges {
  @Input() rules: IRule[] = [];
  @Input() allActivities: IActivity[] = [];
  @Input() period: RulePeriod = 'day';
  @Input() selectedDate = '';

  @Output() daySelected = new EventEmitter<string>();
  @Output() monthChanged = new EventEmitter<Date>();

  @ViewChild('daysSection') daysSectionRef?: ElementRef;

  private translate = inject(TranslateService);
  private readonly today = format(new Date(), 'yyyy-MM-dd');

  currentDate = new Date();
  weeks: CalendarDay[][] = [];
  weekStatuses: DayStatus[] = [];
  monthStatus: DayStatus = 'none';
  monthPathD = '';
  clipPathId = '';
  currentWeekIndex = -1;
  todayColInWeek = 0;
  private monthParams: { cs: number; endC: number; endR: number } | null = null;

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
    this.clipPathId = 'agg-clip-' + Math.random().toString(36).slice(2);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rules'] || changes['allActivities'] || changes['period']) {
      this.buildCalendar();
    }
  }

  get monthLabel(): string {
    const lang = this.translate.currentLang || 'en';
    const label = this.currentDate.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  prevMonth(): void {
    this.currentDate = subMonths(this.currentDate, 1);
    this.buildCalendar();
    this.monthChanged.emit(this.currentDate);
  }

  nextMonth(): void {
    this.currentDate = addMonths(this.currentDate, 1);
    this.buildCalendar();
    this.monthChanged.emit(this.currentDate);
  }

  onDayClick(day: CalendarDay): void {
    if (this.period === 'month') return;
    if (this.period === 'week') {
      this.daySelected.emit(format(startOfWeek(parseISO(day.date), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else {
      if (!day.isCurrentMonth) {
        this.currentDate = parseISO(day.date);
        this.buildCalendar();
        this.monthChanged.emit(this.currentDate);
      }
      this.daySelected.emit(day.date);
    }
  }

  isSelectedDay(day: CalendarDay): boolean {
    return this.period === 'day' && day.date === this.selectedDate;
  }

  isSelectedWeek(week: CalendarDay[]): boolean {
    if (this.period !== 'week' || !this.selectedDate) return false;
    const selectedMonday = format(startOfWeek(parseISO(this.selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return week[0].date === selectedMonday;
  }

  getMonthSvgFill(): string {
    if (this.monthStatus === 'met') return 'rgba(45, 211, 111, 0.22)';
    if (this.monthStatus === 'broken') return 'rgba(235, 68, 90, 0.12)';
    return 'transparent';
  }

  private buildCalendar(): void {
    const monthStart = startOfMonth(this.currentDate);
    const monthEnd = endOfMonth(this.currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
    const dayObjects: CalendarDay[] = allDays.map(d => {
      const dateStr = format(d, 'yyyy-MM-dd');
      return {
        date: dateStr,
        dayNumber: d.getDate(),
        isCurrentMonth: d.getMonth() === this.currentDate.getMonth(),
        isToday: dateStr === this.today,
        periodStatus: this.getPeriodStatus(dateStr),
        activityStatus: this.getActivityStatus(dateStr),
      };
    });

    this.weeks = [];
    for (let i = 0; i < dayObjects.length; i += 7) {
      this.weeks.push(dayObjects.slice(i, i + 7));
    }

    this.currentWeekIndex = -1;
    this.todayColInWeek = 0;
    this.weeks.forEach((week, i) => {
      const idx = week.findIndex(d => d.isToday);
      if (idx >= 0) { this.currentWeekIndex = i; this.todayColInWeek = idx; }
    });

    this.weekStatuses = this.weeks.map((week, i) => {
      const ref = i === this.currentWeekIndex ? week[this.todayColInWeek] : week[3];
      return ref?.periodStatus ?? 'none';
    });

    this.monthPathD = '';
    this.monthParams = null;
    if (this.period === 'month') {
      const firstCurrent = dayObjects.find(d => d.isCurrentMonth && d.periodStatus !== 'none');
      this.monthStatus = firstCurrent?.periodStatus ?? 'none';
      if (this.monthStatus !== 'none') {
        const cs = this.weeks[0].findIndex(d => d.isCurrentMonth);
        const todayNow = new Date();
        const isThisMonth = this.currentDate.getFullYear() === todayNow.getFullYear()
          && this.currentDate.getMonth() === todayNow.getMonth();
        let endC: number, endR: number;
        if (isThisMonth && this.currentWeekIndex >= 0) {
          endR = this.currentWeekIndex; endC = this.todayColInWeek;
        } else {
          const lastWeekIdx = this.weeks.length - 1;
          const ce = [...this.weeks[lastWeekIdx]].reverse().findIndex(d => d.isCurrentMonth);
          endC = ce >= 0 ? 6 - ce : 6; endR = lastWeekIdx;
        }
        this.monthParams = { cs, endC, endR };
        this.monthPathD = this.buildMonthPath(cs, endC, endR);
        setTimeout(() => this.refreshMonthPath(), 0);
      }
    }
  }

  private refreshMonthPath(): void {
    if (!this.monthParams || !this.daysSectionRef) return;
    const cellPx = this.daysSectionRef.nativeElement.getBoundingClientRect().width / 7;
    const { cs, endC, endR } = this.monthParams;
    this.monthPathD = this.buildMonthPath(cs, endC, endR, cellPx);
  }

  private buildMonthPath(cs: number, endC: number, endR: number, cellPx = 50): string {
    const r = 20 / cellPx;
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
    p.push(`M ${(hasTopNotch ? cs : 0) + r} 0`);
    p.push(`L ${W - r} 0 A ${r} ${r} 0 0 1 ${W} ${r}`);
    if (hasBotNotch) {
      p.push(`L ${W} ${endR - r} A ${r} ${r} 0 0 1 ${W - r} ${endR}`);
      p.push(`L ${endC + 1 + r} ${endR} A ${r} ${r} 0 0 0 ${endC + 1} ${endR + r}`);
      p.push(`L ${endC + 1} ${endR + 1 - r} A ${r} ${r} 0 0 1 ${endC + 1 - r} ${endR + 1}`);
    } else {
      p.push(`L ${W} ${endR + 1 - r} A ${r} ${r} 0 0 1 ${W - r} ${endR + 1}`);
    }
    p.push(`L ${r} ${endR + 1} A ${r} ${r} 0 0 1 0 ${endR + 1 - r}`);
    if (hasTopNotch) {
      p.push(`L 0 ${1 + r} A ${r} ${r} 0 0 1 ${r} 1`);
      p.push(`L ${cs - r} 1 A ${r} ${r} 0 0 0 ${cs} ${1 - r}`);
      p.push(`L ${cs} ${r} A ${r} ${r} 0 0 1 ${cs + r} 0`);
    } else {
      p.push(`L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0`);
    }
    p.push('Z');
    return p.join(' ');
  }

  /** Period-level aggregate status: all rules met → met; any broken → broken. */
  private getPeriodStatus(date: string): DayStatus {
    if (date > this.today) return 'none';
    const active = this.rules.filter(r => r.startDate <= date);
    if (!active.length) return 'none';
    for (const rule of active) {
      const [start, end] = this.getPeriodRange(date, rule.period);
      const matching = this.allActivities.filter(
        a => a.date >= start && a.date <= end && this.matchesRule(a, rule),
      );
      if (!this.isMet(this.computeMetric(matching, rule), rule)) return 'broken';
    }
    return 'met';
  }

  /** Per-day activity coloring for week/month: >= rule activity → met; <= / value=0 → broken. */
  private getActivityStatus(date: string): DayStatus {
    if (date > this.today) return 'none';
    let hasMet = false;
    for (const rule of this.rules) {
      if (rule.startDate > date) continue;
      if (!this.allActivities.some(a => a.date === date && this.matchesRule(a, rule))) continue;
      if (rule.value === 0 || rule.operator === '<=') return 'broken';
      hasMet = true;
    }
    return hasMet ? 'met' : 'none';
  }

  private getPeriodRange(date: string, period: RulePeriod): [string, string] {
    if (period === 'day') return [date, date];
    const d = parseISO(date);
    if (period === 'week') {
      return [
        format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      ];
    }
    return [format(startOfMonth(d), 'yyyy-MM-dd'), format(endOfMonth(d), 'yyyy-MM-dd')];
  }

  private matchesRule(activity: IActivity, rule: IRule): boolean {
    let subjectMatch = false;
    if (rule.subjectType === 'action') {
      subjectMatch = activity.actions.some(a => a.id === rule.subjectId);
    } else if (rule.subjectType === 'tag') {
      subjectMatch = activity.tags.some(t => t.id === rule.subjectId)
        || activity.actions.some(a => a.tags.some(t => t.id === rule.subjectId));
    } else {
      subjectMatch = activity.items.some(i => i.id === rule.subjectId);
    }
    if (!subjectMatch) return false;
    if (rule.startTime && rule.endTime) {
      const t = activity.startTime;
      if (t < rule.startTime || t > rule.endTime) return false;
    }
    return true;
  }

  private computeMetric(activities: IActivity[], rule: IRule): number {
    if (rule.metric === 'count') return activities.length;
    if (rule.metric === 'totalDuration') return activities.reduce((s, a) => s + getActivityDurationMinutes(a), 0);
    return new Set(activities.map(a => a.date)).size;
  }

  private isMet(value: number, rule: IRule): boolean {
    if (rule.value === 0) return value === 0;
    return rule.operator === '>=' ? value >= rule.value : value <= rule.value;
  }
}
