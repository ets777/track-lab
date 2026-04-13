import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { IRule, RuleMetric, RulePeriod } from 'src/app/db/models/rule';
import { RuleService } from 'src/app/services/rule.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';

const METRIC_KEY: Record<RuleMetric, string> = {
  count: 'TK_COUNT',
  totalDuration: 'TK_TOTAL_DURATION',
  countDays: 'TK_COUNT_DAYS',
};

const PERIOD_KEY: Record<RulePeriod, string> = {
  day: 'TK_DAILY',
  week: 'TK_WEEKLY',
  month: 'TK_MONTHLY',
};

@Component({
  selector: 'app-rule-view',
  templateUrl: './rule-view.page.html',
  styleUrls: ['./rule-view.page.scss'],
  imports: [IonLabel, IonItem, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, TranslateModule, BackButtonComponent],
})
export class RuleViewPage {
  private route = inject(ActivatedRoute);
  private ruleService = inject(RuleService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);

  ruleId: number;
  rule?: IRule;
  ruleName = '';

  constructor() {
    this.ruleId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    const [rule, actions, tags, items] = await Promise.all([
      this.ruleService.getById(this.ruleId),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.itemService.getAll(),
    ]);

    this.rule = rule;

    if (rule) {
      let subjectName = '';
      if (rule.subjectType === 'action') {
        subjectName = actions.find(a => a.id === rule.subjectId)?.name ?? '';
      } else if (rule.subjectType === 'tag') {
        subjectName = tags.find(t => t.id === rule.subjectId)?.name ?? '';
      } else {
        subjectName = items.find(i => i.id === rule.subjectId)?.name ?? '';
      }
      this.ruleName = this.ruleService.buildName(rule, subjectName);
    }
  }

  get metricLabel(): string {
    return this.rule ? this.translate.instant(METRIC_KEY[this.rule.metric]) : '';
  }

  get periodLabel(): string {
    return this.rule ? this.translate.instant(PERIOD_KEY[this.rule.period]) : '';
  }

  get conditionLabel(): string {
    if (!this.rule) return '';
    const op = this.translate.instant(this.rule.operator === '>=' ? 'TK_AT_LEAST' : 'TK_AT_MOST');
    return `${op} ${this.rule.value}`;
  }
}
