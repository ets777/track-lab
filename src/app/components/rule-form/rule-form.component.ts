import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonItem, IonLabel, IonSegment, IonSegmentButton, IonText, IonCheckbox } from '@ionic/angular/standalone';
import { TimeWheelComponent } from 'src/app/form-elements/time-wheel/time-wheel.component';
import { CountWheelComponent } from 'src/app/form-elements/count-wheel/count-wheel.component';
import { DatePickerComponent } from 'src/app/form-elements/date-picker/date-picker.component';
import { Selectable, CommonItem } from 'src/app/types/selectable';
import { TagService } from 'src/app/services/tag.service';
import { ActionService } from 'src/app/services/action.service';
import { ItemService } from 'src/app/services/item.service';
import { ListService } from 'src/app/services/list.service';
import { IItem } from 'src/app/db/models/item';
import { IList } from 'src/app/db/models/list';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { filterUniqueElements } from 'src/app/functions/item';
import { capitalize } from 'src/app/functions/string';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { timeFormatValidator } from 'src/app/validators/time-format.validator';
import { IRule, RuleMetric, RuleOperator, RulePeriod } from 'src/app/db/models/rule';

export type RuleFormMetric = 'count' | 'duration';

export type RuleForm = {
  startDate: string;
  subject: CommonItem;
  metric: RuleFormMetric;
  operator: RuleOperator;
  value: number;
  period: RulePeriod;
  timeEnabled: boolean;
  startTime: string;
  endTime: string;
};

@Component({
  selector: 'app-rule-form',
  templateUrl: './rule-form.component.html',
  styleUrls: ['./rule-form.component.scss'],
  imports: [
    IonItem, IonLabel, IonSegment, IonSegmentButton, IonText, IonCheckbox,
    FormsModule, ReactiveFormsModule, TranslateModule,
    SelectSearchComponent, ValidationErrorDirective, TimeWheelComponent, CountWheelComponent, DatePickerComponent,
  ],
})
export class RuleFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private translate = inject(TranslateService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);

  @Input() rule?: IRule;

  private lists: IList[] = [];
  public suggestions: Selectable<CommonItem>[] = [];

  public ruleForm!: ModelFormGroup<RuleForm>;

  async ngOnInit() {
    const today = new Date().toISOString().slice(0, 10);
    this.ruleForm = this.formBuilder.group({
      startDate: [today, [Validators.required, dateFormatValidator]],
      subject: [null as CommonItem | null, Validators.required],
      metric: ['count' as RuleFormMetric, Validators.required],
      operator: ['>=' as RuleOperator, Validators.required],
      value: [1, [Validators.required, Validators.min(0), Validators.pattern(/^(0|[1-9][0-9]*)$/)]],
      period: ['day' as RulePeriod, Validators.required],
      timeEnabled: [false],
      startTime: ['00:00', [Validators.required, timeFormatValidator]],
      endTime: ['23:59', [Validators.required, timeFormatValidator]],
    });

    await this.loadSuggestions();

    if (this.rule) {
      this.populateFromRule();
    }
  }

  private populateFromRule() {
    const rule = this.rule!;
    const subject = this.suggestions.find(
      s => s.item.type === rule.subjectType && s.item.itemId === rule.subjectId
    )?.item ?? null;

    const metric: RuleFormMetric = rule.metric === 'totalDuration' ? 'duration' : 'count';

    this.ruleForm.patchValue({
      startDate: rule.startDate,
      subject,
      metric,
      operator: rule.operator,
      value: rule.value,
      period: rule.period,
      timeEnabled: !!rule.startTime,
      startTime: rule.startTime ?? '00:00',
      endTime: rule.endTime ?? '23:59',
    });
  }

  async loadSuggestions() {
    this.lists = await this.listService.getAll();

    const actions = (await this.actionService.getAllUnhidden()).map((action) => ({
      name: action.name,
      type: 'action',
      itemId: action.id,
    } as CommonItem));

    const tags = (await this.tagService.getAllUnhidden()).map((tag) => ({
      name: tag.name,
      type: 'tag',
      itemId: tag.id,
    } as CommonItem));

    const items = (await this.itemService.getAllUnhidden()).map((item) => ({
      name: item.name,
      type: this.getItemType(item),
      itemId: item.id,
    } as CommonItem));

    const allItems = filterUniqueElements([...actions, ...tags, ...items]);

    this.suggestions = allItems.map((item, index) => ({
      num: index,
      title: item.name,
      subtitle: this.getSubtitle(item),
      item,
    }));
  }

  private getItemType(item: IItem): string {
    const list = this.lists.find((l) => l.id === item.listId);
    return list?.name ?? '';
  }

  private getSubtitle(item: CommonItem): string {
    if (['action', 'tag'].includes(item.type)) {
      return this.translate.instant('TK_' + item.type.toUpperCase());
    }
    return capitalize(item.type) ?? item.type;
  }

  get unitLabel(): string {
    const metric = this.ruleForm?.get('metric')?.value;
    const value = this.ruleForm?.get('value')?.value;
    const singular = Number(value) === 1;
    if (metric === 'duration') {
      return this.translate.instant(singular ? 'TK_RULE_MINUTE' : 'TK_RULE_MINUTES');
    }
    return this.translate.instant(singular ? 'TK_RULE_TIME' : 'TK_RULE_TIMES');
  }

  get previewName(): string {
    const subject = this.ruleForm?.get('subject')?.value;
    if (!subject) return '';

    const value = this.ruleForm.get('value')?.value;
    const timeEnabled = this.ruleForm.get('timeEnabled')?.value;
    const startTime = this.ruleForm.get('startTime')?.value;
    const endTime = this.ruleForm.get('endTime')?.value;
    const timeSuffix = timeEnabled && startTime && endTime
      ? ' ' + this.translate.instant('TK_RULE_FROM_TO', { start: startTime, end: endTime })
      : '';

    if (Number(value) === 0) {
      return this.translate.instant('TK_RULE_NO_SUBJECT', { subject: subject.name }) + timeSuffix;
    }

    const operator = this.ruleForm.get('operator')?.value;
    const metric = this.ruleForm.get('metric')?.value;
    const period = this.ruleForm.get('period')?.value;

    const operatorLabel = this.translate.instant(operator === '>=' ? 'TK_AT_LEAST' : 'TK_AT_MOST').toLowerCase();
    const singular = Number(value) === 1;
    const unit = metric === 'duration'
      ? this.translate.instant(singular ? 'TK_RULE_MINUTE' : 'TK_RULE_MINUTES')
      : this.translate.instant(singular ? 'TK_RULE_TIME' : 'TK_RULE_TIMES');
    const periodLabel = this.translate.instant(`TK_RULE_PER_${period?.toUpperCase()}`);
    return `${subject.name} ${operatorLabel} ${value} ${unit} ${periodLabel}${timeSuffix}`;
  }

  get timeEnabled(): boolean {
    return !!this.ruleForm?.get('timeEnabled')?.value;
  }

  setDefaultData() {
    this.ruleForm.patchValue({
      startDate: new Date().toISOString().slice(0, 10),
      subject: null,
      metric: 'count' as RuleFormMetric,
      operator: '>=',
      value: 1,
      period: 'day',
      timeEnabled: false,
      startTime: '00:00',
      endTime: '23:59',
    });
  }
}
