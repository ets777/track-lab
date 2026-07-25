import { inject, Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatabaseService } from './db/database.service';
import { RuleForm } from '../components/rule-form/rule-form.component';
import { IRuleDb, IRuleCreateDto, RuleMetric } from '../db/models/rule';
import { RuleCompletionService } from './rule-completion.service';

@Injectable({ providedIn: 'root' })
export class RuleService extends DatabaseService<'rules'> {
  protected tableName: 'rules' = 'rules';
  private translate = inject(TranslateService);
  // Resolved lazily: RuleCompletionService pulls in ActivityService, which
  // reaches back here through the entity services. Injecting it eagerly would
  // close a DI cycle at construction time.
  private injector = inject(Injector);

  buildName(rule: Omit<IRuleDb, 'id'>, subjectName: string): string {
    const timeSuffix = rule.startTime && rule.endTime
      ? ' ' + this.translate.instant('TK_RULE_FROM_TO', { start: rule.startTime, end: rule.endTime })
      : '';

    if (rule.value === 0) {
      return this.translate.instant('TK_RULE_NO_SUBJECT', { subject: subjectName }) + timeSuffix;
    }
    const condition = this.buildCondition(rule);
    const period = this.translate.instant(`TK_RULE_PER_${rule.period.toUpperCase()}`);
    return `${subjectName} ${condition} ${period}${timeSuffix}`;
  }

  buildCondition(rule: Pick<IRuleDb, 'operator' | 'value' | 'metric'>): string {
    const operator = this.translate.instant(rule.operator === '>=' ? 'TK_AT_LEAST' : 'TK_AT_MOST').toLowerCase();
    const singular = rule.value === 1;
    const unit = rule.metric === 'totalDuration'
      ? this.translate.instant(singular ? 'TK_RULE_MINUTE' : 'TK_RULE_MINUTES')
      : this.translate.instant(singular ? 'TK_RULE_TIME' : 'TK_RULE_TIMES');
    return `${operator} ${rule.value} ${unit}`;
  }

  async updateFromForm(id: number, formData: RuleForm): Promise<void> {
    const changes: IRuleCreateDto = {
      startDate: formData.startDate,
      endDate: formData.endDateEnabled ? formData.endDate : null,
      subjectType: formData.subject.type as any,
      subjectId: formData.subject.itemId,
      metric: this.resolveMetric(formData),
      operator: formData.operator,
      value: formData.value,
      period: formData.period,
      startTime: formData.timeEnabled ? formData.startTime : null,
      endTime: formData.timeEnabled ? formData.endTime : null,
    };
    await this.update(id, changes);
  }

  async addFromForm(formData: RuleForm): Promise<number> {
    const dto: IRuleCreateDto = {
      startDate: formData.startDate,
      endDate: formData.endDateEnabled ? formData.endDate : null,
      subjectType: formData.subject.type as any,
      subjectId: formData.subject.itemId,
      metric: this.resolveMetric(formData),
      operator: formData.operator,
      value: formData.value,
      period: formData.period,
      startTime: formData.timeEnabled ? formData.startTime : null,
      endTime: formData.timeEnabled ? formData.endTime : null,
    };
    return this.add(dto);
  }

  /**
   * Delete a rule together with its archived completions.
   *
   * `ruleCompletions.ruleId` has no foreign key, so the completions do not
   * cascade — every deletion path must come through here or they leak.
   */
  async deleteWithRelations(id: number): Promise<void> {
    const ruleCompletionService = this.injector.get(RuleCompletionService);

    await ruleCompletionService.deleteByRuleId(id);
    await this.delete({ id });
  }

  private resolveMetric(formData: RuleForm): RuleMetric {
    if (formData.metric === 'duration') {
      return 'totalDuration';
    }
    return formData.period === 'day' ? 'count' : 'countDays';
  }
}
