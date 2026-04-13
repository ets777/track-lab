import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatabaseService } from './db/database.service';
import { RuleForm } from '../components/rule-form/rule-form.component';
import { IRuleDb, IRuleCreateDto, RuleMetric } from '../db/models/rule';

@Injectable({ providedIn: 'root' })
export class RuleService extends DatabaseService<'rules'> {
  protected tableName: 'rules' = 'rules';
  private translate = inject(TranslateService);

  buildName(rule: Omit<IRuleDb, 'id'>, subjectName: string): string {
    const operator = this.translate.instant(rule.operator === '>=' ? 'TK_AT_LEAST' : 'TK_AT_MOST').toLowerCase();
    const singular = rule.value === 1;
    const unit = rule.metric === 'totalDuration'
      ? this.translate.instant(singular ? 'TK_RULE_MINUTE' : 'TK_RULE_MINUTES')
      : this.translate.instant(singular ? 'TK_RULE_TIME' : 'TK_RULE_TIMES');
    const period = this.translate.instant(`TK_RULE_PER_${rule.period.toUpperCase()}`);
    return `${subjectName} ${operator} ${rule.value} ${unit} ${period}`;
  }

  async updateFromForm(id: number, formData: RuleForm): Promise<void> {
    const changes: IRuleCreateDto = {
      startDate: formData.startDate,
      subjectType: formData.subject.type as any,
      subjectId: formData.subject.itemId,
      metric: this.resolveMetric(formData),
      operator: formData.operator,
      value: formData.value,
      period: formData.period,
    };
    await this.update(id, changes);
  }

  async addFromForm(formData: RuleForm): Promise<number> {
    const dto: IRuleCreateDto = {
      startDate: formData.startDate,
      subjectType: formData.subject.type as any,
      subjectId: formData.subject.itemId,
      metric: this.resolveMetric(formData),
      operator: formData.operator,
      value: formData.value,
      period: formData.period,
    };
    return this.add(dto);
  }

  private resolveMetric(formData: RuleForm): RuleMetric {
    if (formData.metric === 'duration') {
      return 'totalDuration';
    }
    return formData.period === 'day' ? 'count' : 'countDays';
  }
}
