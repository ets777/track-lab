import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatabaseService } from './db/database.service';
import { RuleForm } from '../components/rule-form/rule-form.component';
import { IRuleCreateDto, RuleMetric } from '../db/models/rule';

@Injectable({ providedIn: 'root' })
export class RuleService extends DatabaseService<'rules'> {
  protected tableName: 'rules' = 'rules';
  private translate = inject(TranslateService);

  async addFromForm(formData: RuleForm): Promise<number> {
    const dto: IRuleCreateDto = {
      name: this.buildName(formData),
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

  private buildName(formData: RuleForm): string {
    const subject = formData.subject.name;
    const operator = this.translate.instant(formData.operator === '>=' ? 'TK_AT_LEAST' : 'TK_AT_MOST').toLowerCase();
    const value = formData.value;
    const unit = formData.metric === 'duration'
      ? this.translate.instant('TK_MINUTES')
      : this.translate.instant('TK_RULE_TIMES');
    const period = this.translate.instant(`TK_RULE_PER_${formData.period.toUpperCase()}`);
    return `${subject} ${operator} ${value} ${unit} ${period}`;
  }

  private resolveMetric(formData: RuleForm): RuleMetric {
    if (formData.metric === 'duration') {
      return 'totalDuration';
    }
    return formData.period === 'day' ? 'count' : 'countDays';
  }
}
