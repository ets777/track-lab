import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonSegment, IonSegmentButton, IonCheckbox, IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, searchOutline, closeOutline } from 'ionicons/icons';
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
import { filterUniqueElements } from 'src/app/functions/item';
import { capitalize } from 'src/app/functions/string';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { timeFormatValidator } from 'src/app/validators/time-format.validator';
import { IRule, RuleMetric, RuleOperator, RulePeriod } from 'src/app/db/models/rule';
import { CreateEntitySheetComponent, CreateEntityType, CreatedEntity } from '../create-entity-sheet/create-entity-sheet.component';
import { todayLocal } from 'src/app/functions/date';

export type RuleFormMetric = 'count' | 'duration';

export type RuleForm = {
  startDate: string;
  endDateEnabled: boolean;
  endDate: string;
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
    IonSegment, IonSegmentButton, IonCheckbox, IonIcon, IonModal,
    FormsModule, ReactiveFormsModule, TranslateModule,
    TimeWheelComponent, CountWheelComponent, DatePickerComponent, CreateEntitySheetComponent,
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
  public submitted = false;

  public pickerOpen = false;
  public pickerQuery = '';
  public createOpen = false;
  public createType: CreateEntityType = 'action';

  /** Rules measure actions, tags and items — metrics are not valid subjects. */
  public readonly subjectCreateOptions: { type: CreateEntityType; label: string }[] = [
    { type: 'action', label: 'TK_NEW_ACTION' },
    { type: 'tag', label: 'TK_NEW_TAG' },
    { type: 'item', label: 'TK_NEW_ITEM' },
  ];

  constructor() {
    addIcons({ chevronForwardOutline, searchOutline, closeOutline });
  }

  public ruleForm!: ModelFormGroup<RuleForm>;

  async ngOnInit() {
    const today = todayLocal();
    this.ruleForm = this.formBuilder.group({
      startDate: [today, [Validators.required, dateFormatValidator]],
      endDateEnabled: [false],
      endDate: [today, [Validators.required, dateFormatValidator]],
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
      endDateEnabled: !!rule.endDate,
      endDate: rule.endDate ?? todayLocal(),
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
    if (!item.type) {
      return this.translate.instant('TK_ITEM');
    }
    // Items carry their list name as `type`, and seeded lists store that name as a translation key.
    return capitalize(this.translate.instant(item.type)) ?? item.type;
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

  get endDateEnabled(): boolean {
    return !!this.ruleForm?.get('endDateEnabled')?.value;
  }

  get startDateValue(): string {
    return this.ruleForm?.get('startDate')?.value ?? '';
  }

  /** End date must not precede start date. */
  get endBeforeStart(): boolean {
    if (!this.endDateEnabled) return false;
    const start = this.ruleForm?.get('startDate')?.value;
    const end = this.ruleForm?.get('endDate')?.value;
    return !!start && !!end && end < start;
  }

  get selectedSubject(): CommonItem | null {
    return this.ruleForm?.get('subject')?.value ?? null;
  }

  get pickerResults(): Selectable<CommonItem>[] {
    const q = this.pickerQuery.trim().toLowerCase();
    if (!q) return this.suggestions;
    return this.suggestions.filter(
      s => s.title.toLowerCase().includes(q) || (s.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }

  openPicker(): void {
    this.pickerQuery = '';
    this.pickerOpen = true;
  }

  closePicker(): void {
    this.pickerOpen = false;
  }

  selectSubject(res: Selectable<CommonItem>): void {
    this.setSubject(res.item);
    this.pickerOpen = false;
  }

  private setSubject(item: CommonItem): void {
    const subject = this.ruleForm.get('subject');
    subject?.setValue(item);
    subject?.markAsTouched();
  }

  /** Swap the picker for the create sheet; the created subject gets selected on the way back. */
  openCreate(type: CreateEntityType): void {
    this.createType = type;
    this.pickerOpen = false;
    this.createOpen = true;
  }

  closeCreate(): void {
    this.createOpen = false;
  }

  async onSubjectCreated(entity: CreatedEntity): Promise<void> {
    this.createOpen = false;
    await this.loadSuggestions();

    // Items carry their list name as `type`, so match them by everything but the type.
    const created = this.suggestions.find(s => entity.type === 'item'
      ? s.item.itemId === entity.id && !['action', 'tag'].includes(s.item.type)
      : s.item.itemId === entity.id && s.item.type === entity.type);

    if (created) {
      this.setSubject(created.item);
    }
  }

  /** Validate-on-submit: mark submitted, mark all touched, return validity. */
  async validate(): Promise<boolean> {
    this.submitted = true;
    this.ruleForm.markAllAsTouched();
    return this.ruleForm.valid && !this.endBeforeStart;
  }

  /** Show a field's validation error only after submit was attempted. */
  showError(name: string): boolean {
    return this.submitted && !!this.ruleForm?.get(name)?.invalid;
  }

  /** Translate a single control's errors into user-facing messages. */
  fieldErrors(name: string): string[] {
    return this.messagesFor(this.ruleForm?.get(name)?.errors ?? null);
  }

  private messagesFor(errors: ValidationErrors | null): string[] {
    if (!errors) return [];

    const messages: string[] = [];
    if (errors['required']) messages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
    if (errors['pattern']) messages.push(this.translate.instant('TK_VALUE_MUST_BE_A_NUMBER'));
    for (const key of Object.keys(errors)) {
      if (errors[key]?.message) {
        messages.push(this.translate.instant(errors[key].message, errors[key].params));
      }
    }
    return [...new Set(messages)];
  }

  setDefaultData() {
    this.submitted = false;
    this.ruleForm.patchValue({
      startDate: todayLocal(),
      endDateEnabled: false,
      endDate: todayLocal(),
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
