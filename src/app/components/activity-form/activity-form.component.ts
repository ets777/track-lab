import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonTextarea, IonList, IonIcon, IonAccordionGroup, IonAccordion, IonRange, IonCheckbox, IonButton } from '@ionic/angular/standalone';
import { ActivityService } from 'src/app/services/activity.service';
import { ActivityMetricService } from 'src/app/services/activity-metric.service';
import { Time } from 'src/app/Time';
import { addDays, format } from 'date-fns';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { MaskitoDirective } from '@maskito/angular';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { maskitoTimeOptionsGenerator } from '@maskito/kit';
import { timeFormatValidator } from 'src/app/validators/time-format.validator';
import { getPartIndex } from 'src/app/functions/string';
import { IActivity } from 'src/app/db/models/activity';
import { IActionDb } from 'src/app/db/models/action';
import { IActionMetricDb } from 'src/app/db/models/action-metric';
import { IActionTagDb } from 'src/app/db/models/action-tag';
import { ITagDb } from 'src/app/db/models/tag';
import { ITagMetricDb } from 'src/app/db/models/tag-metric';
import { ITermMetricDb } from 'src/app/db/models/term-metric';
import { ActionMetricService } from 'src/app/services/action-metric.service';
import { ActionTagService } from 'src/app/services/action-tag.service';
import { TagService } from 'src/app/services/tag.service';
import { TagMetricService } from 'src/app/services/tag-metric.service';
import { TermMetricService } from 'src/app/services/term-metric.service';
import { TermService } from 'src/app/services/term.service';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { entitiesToString } from 'src/app/functions/string';
import { ActionService } from 'src/app/services/action.service';
import { MetricService } from 'src/app/services/metric.service';
import { IMetric } from 'src/app/db/models/metric';
import { tagsValidator } from 'src/app/validators/tags.validator';
import { duplicatedItemsValidator } from 'src/app/validators/duplicated-items.validator';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { TagInputComponent } from '../../form-elements/tag-input/tag-input.component';
import { DictionaryService } from 'src/app/services/dictionary.service';
import { ActionDictionaryService } from 'src/app/services/action-dictionary.service';
import { IDictionary } from 'src/app/db/models/dictionary';
import { IActionDictionaryDb } from 'src/app/db/models/action-dictionary';
import { DictionaryInputComponent } from '../../form-elements/dictionary-input/dictionary-input.component';

function metricRangeValidator(min?: number, max?: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '' || value === undefined) return null;
    const num = Number(value);
    if (isNaN(num)) return { pattern: true };
    if (min !== undefined && num < min) return { minRange: { message: 'TK_VALUE_BELOW_MIN', params: { min } } };
    if (max !== undefined && num > max) return { maxRange: { message: 'TK_VALUE_EXCEEDS_MAX', params: { max } } };
    return null;
  };
}

export type ActivityForm = {
  actions: string,
  startTime: string,
  endTime: string,
  comment: string,
  date: string,
  tags: string,
};

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss'],
  imports: [IonButton, IonRange, IonCheckbox, IonAccordion, IonAccordionGroup, IonIcon, IonList, IonTextarea, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective, ValidationErrorDirective, TagInputComponent, DictionaryInputComponent],
})
export class ActivityFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private activityService = inject(ActivityService);
  private translate = inject(TranslateService);
  private actionService = inject(ActionService);
  private metricService = inject(MetricService);
  private activityMetricService = inject(ActivityMetricService);

  @Input() activity?: IActivity;
  @Input() activityMetricValues?: Record<number, number>;

  @ViewChild('actionsInput') actionInput!: IonInput;
  actionInputCaretPosition = 0;
  actionInputText = '';

  protected readonly dateMask: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
  };
  protected readonly maskPredicate: MaskitoElementPredicate =
    async (el) => (el as unknown as HTMLIonInputElement).getInputElement();
  protected readonly timeMask: MaskitoOptions = maskitoTimeOptionsGenerator({
    mode: 'HH:MM',
  });

  private actionMetricService2 = inject(ActionMetricService);
  private actionTagService = inject(ActionTagService);
  private tagService = inject(TagService);
  private tagMetricService = inject(TagMetricService);
  private termMetricService = inject(TermMetricService);
  private termService = inject(TermService);
  private dictionaryService = inject(DictionaryService);
  private actionDictionaryService = inject(ActionDictionaryService);
  private allMetrics: IMetric[] = [];
  private allActionMetrics: IActionMetricDb[] = [];
  private allTagMetrics: ITagMetricDb[] = [];
  private allTermMetrics: ITermMetricDb[] = [];
  private allActionTags: IActionTagDb[] = [];
  private allTags: ITagDb[] = [];
  private allActions: IActionDb[] = [];
  private allDictionaries: IDictionary[] = [];
  private allActionDictionaries: IActionDictionaryDb[] = [];
  // dictionaryId -> (lowerCaseName -> termId)
  private termLookup = new Map<number, Map<string, number>>();

  @Input() activityTermValues: Record<number, string> = {};

  public activityForm: ModelFormGroup<ActivityForm>;
  public metricsForm: FormGroup = this.formBuilder.group({});
  public dictionariesForm: FormGroup = this.formBuilder.group({});
  public standaloneMetrics: IMetric[] = [];
  public standaloneDictionaries: IDictionary[] = [];
  public metricEnabled: Record<string, boolean> = {};

  filteredActionSuggestions: string[] = [];
  private allActionSuggestions: string[] = [];
  showActionSuggestions = false;

  private currentTime: string = '00:00';

  constructor() {
    this.activityForm = this.formBuilder.group({
      actions: ['', [Validators.required, duplicatedItemsValidator]],
      startTime: ['', [Validators.required, timeFormatValidator]],
      endTime: ['', timeFormatValidator],
      comment: [''],
      date: ['', [Validators.required, dateFormatValidator]],
      tags: ['', tagsValidator],
    });
    this.setCurrentTime();

    setInterval(() => {
      this.setCurrentTime();
    }, 5000);
  }

  async refreshMetricsAndDictionaries() {
    await this.loadMetrics();
    await this.loadDictionaries();
  }

  async ngOnInit() {
    await this.fetchAllSuggestions();
    await this.loadMetrics();
    await this.loadDictionaries();

    this.activityForm.get('actions')!.valueChanges.subscribe(() => {
      this.updateVisibleMetrics();
      this.updateVisibleDictionaries();
    });
    this.activityForm.get('tags')!.valueChanges.subscribe(() => this.updateVisibleMetrics());

    if (this.activity) {
      this.setActivityData(this.activity);
    } else {
      await this.setDefaultData();
    }
  }

  isRangeMetric(metric: IMetric): boolean {
    if (metric.minValue == null || metric.maxValue == null || !metric.step) return false;
    return (metric.maxValue - metric.minValue) / metric.step <= 100;
  }

  getRangeColor(metric: IMetric): string {
    const value = this.metricsForm.get(`metric_${metric.id}`)?.value;
    if (value == null || metric.minValue == null || metric.maxValue == null) return '';
    const pct = (value - metric.minValue) / (metric.maxValue - metric.minValue) * 100;
    if (pct < 20) return '#f44336';
    if (pct < 40) return '#ff9800';
    if (pct < 60) return '#e6c200';
    if (pct < 80) return '#8bc34a';
    return '#4caf50';
  }

  async loadMetrics() {
    this.allMetrics = (await this.metricService.getAll()).filter(m => !m.isHidden);
    [this.allActionMetrics, this.allTagMetrics, this.allTermMetrics, this.allActionTags, this.allTags] = await Promise.all([
      this.actionMetricService2.getAll(),
      this.tagMetricService.getAll(),
      this.termMetricService.getAll(),
      this.actionTagService.getAll(),
      this.tagService.getAll(),
    ]);

    const prevValues = await Promise.all(
      this.allMetrics.map(m =>
        m.showPreviousValue ? this.activityMetricService.getLastValue(m.id) : Promise.resolve(null)
      )
    );

    this.metricsForm = this.formBuilder.group({});
    this.metricEnabled = {};

    for (let i = 0; i < this.allMetrics.length; i++) {
      const metric = this.allMetrics[i];
      const isRange = this.isRangeMetric(metric);
      const mid = (metric.minValue! + metric.maxValue!) / 2;
      const midRounded = isRange ? Math.round((mid - metric.minValue!) / metric.step!) * metric.step! + metric.minValue! : null;

      const prev = prevValues[i];
      const existingValue = this.activityMetricValues?.[metric.id] ?? null;
      const defaultValue = existingValue !== null ? existingValue : (prev !== null ? prev : midRounded);

      const validators = isRange ? [] : [metricRangeValidator(metric.minValue, metric.maxValue)];
      this.metricsForm.addControl(`metric_${metric.id}`, this.formBuilder.control(defaultValue, validators));
      this.metricEnabled[`metric_${metric.id}`] = existingValue !== null;
    }

    this.updateVisibleMetrics();
  }

  updateVisibleMetrics() {
    const actionsText = this.activityForm.get('actions')?.value ?? '';
    const selectedActionNames = new Set(
      actionsText.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    );
    const selectedActionIds = new Set(
      this.allActions.filter(a => selectedActionNames.has(a.name.toLowerCase())).map(a => a.id)
    );

    const tagsText = this.activityForm.get('tags')?.value ?? '';
    const selectedTagNames = new Set(
      tagsText.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    );
    const directTagIds = new Set(
      this.allTags.filter(t => selectedTagNames.has(t.name.toLowerCase())).map(t => t.id)
    );
    const actionTagIds = new Set(
      this.allActionTags.filter(at => selectedActionIds.has(at.actionId)).map(at => at.tagId)
    );
    const relevantTagIds = new Set([...directTagIds, ...actionTagIds]);

    const enteredTermIds = new Set<number>();
    for (const dictionary of this.allDictionaries.filter(d => !d.isHidden)) {
      const value: string = this.dictionariesForm.get(`dictionary_${dictionary.id}`)?.value ?? '';
      const lookup = this.termLookup.get(dictionary.id);
      if (!lookup) continue;
      for (const name of value.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)) {
        const termId = lookup.get(name);
        if (termId !== undefined) enteredTermIds.add(termId);
      }
    }

    const actionLinkedIds = new Set(this.allActionMetrics.map(am => am.metricId));
    const tagLinkedIds = new Set(this.allTagMetrics.map(tm => tm.metricId));
    const termLinkedIds = new Set(this.allTermMetrics.map(tm => tm.metricId));

    this.standaloneMetrics = this.allMetrics.filter(m => {
      if (!actionLinkedIds.has(m.id) && !tagLinkedIds.has(m.id) && !termLinkedIds.has(m.id)) return true;
      if (actionLinkedIds.has(m.id) && this.allActionMetrics.some(am => am.metricId === m.id && selectedActionIds.has(am.actionId))) return true;
      if (tagLinkedIds.has(m.id) && this.allTagMetrics.some(tm => tm.metricId === m.id && relevantTagIds.has(tm.tagId))) return true;
      if (termLinkedIds.has(m.id) && this.allTermMetrics.some(tm => tm.metricId === m.id && enteredTermIds.has(tm.termId))) return true;
      return false;
    });
  }

  onRangeChange(metricId: number) {
    this.metricEnabled[`metric_${metricId}`] = true;
  }

  stepMetric(metric: IMetric, direction: 1 | -1) {
    const key = `metric_${metric.id}`;
    const control = this.metricsForm.get(key);
    if (!control) return;
    const current = Number(control.value) || 0;
    const step = metric.step ?? 1;
    let next = Math.round((current + direction * step) / step) * step;
    if (metric.minValue != null) next = Math.max(metric.minValue, next);
    if (metric.maxValue != null) next = Math.min(metric.maxValue, next);
    control.setValue(parseFloat(next.toFixed(10)));
    this.metricEnabled[key] = true;
  }

  onMetricCheckboxChange(metricId: number, event: any) {
    this.metricEnabled[`metric_${metricId}`] = event.detail.checked;
  }

  getMetricRecords(): { metricId: number; value: number }[] {
    return this.standaloneMetrics
      .map((m) => ({
        metricId: m.id,
        value: this.metricsForm.get(`metric_${m.id}`)?.value,
        enabled: this.metricEnabled[`metric_${m.id}`],
      }))
      .filter((r) => r.enabled && r.value !== null && r.value !== undefined && r.value !== '');
  }

  isMetricsFormValid(): boolean {
    return this.metricsForm.valid;
  }

  async loadDictionaries() {
    const [allTerms] = await Promise.all([
      this.termService.getAll(),
    ]);
    [this.allDictionaries, this.allActionDictionaries] = await Promise.all([
      this.dictionaryService.getAll(),
      this.actionDictionaryService.getAll(),
    ]);

    this.termLookup = new Map();
    for (const term of allTerms) {
      if (!this.termLookup.has(term.dictionaryId)) {
        this.termLookup.set(term.dictionaryId, new Map());
      }
      this.termLookup.get(term.dictionaryId)!.set(term.name.toLowerCase(), term.id);
    }

    this.dictionariesForm = this.formBuilder.group({});
    for (const dictionary of this.allDictionaries.filter(d => !d.isHidden)) {
      const initialValue = this.activityTermValues[dictionary.id] ?? '';
      this.dictionariesForm.addControl(`dictionary_${dictionary.id}`, this.formBuilder.control(initialValue));
    }

    this.dictionariesForm.valueChanges.subscribe(() => this.updateVisibleMetrics());
    this.updateVisibleDictionaries();
  }

  updateVisibleDictionaries() {
    const actionsText = this.activityForm.get('actions')?.value ?? '';
    const selectedActionNames = new Set(
      actionsText.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    );
    const selectedActionIds = new Set(
      this.allActions.filter(a => selectedActionNames.has(a.name.toLowerCase())).map(a => a.id)
    );

    const actionLinkedIds = new Set(this.allActionDictionaries.map(ad => ad.dictionaryId));

    this.standaloneDictionaries = this.allDictionaries.filter(d => {
      if (d.isHidden) return false;
      if (!actionLinkedIds.has(d.id)) return true;
      return this.allActionDictionaries.some(ad => ad.dictionaryId === d.id && selectedActionIds.has(ad.actionId));
    });
  }

  getDictionaryTermRecords(): { dictionaryId: number; termNames: string[] }[] {
    return this.standaloneDictionaries
      .map(d => ({
        dictionaryId: d.id,
        termNames: (this.dictionariesForm.get(`dictionary_${d.id}`)?.value ?? '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
      }))
      .filter(r => r.termNames.length > 0);
  }

  getDictionaryLabel(dictionary: IDictionary): string {
    return this.translate.instant(dictionary.name);
  }

  async fetchAllSuggestions() {
    const actions = await this.actionService.getAllUnhidden();
    this.allActions = actions;
    this.allActionSuggestions = actions.map(a => a.name);
  }

  setCurrentTime() {
    this.currentTime = new Time().toString().slice(0, 5);
  }

  getDefaultData() {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    return {
      actions: '',
      startTime: this.currentTime,
      endTime: this.currentTime,
      comment: '',
      date: currentDate,
      tags: '',
    };
  }

  async setDefaultData() {
    const defaultData = this.getDefaultData();
    const lastActivityData = await this.getLastActivityData();

    this.activityForm.patchValue({
      ...defaultData,
      ...lastActivityData,
    });
    for (const metric of this.standaloneMetrics) {
      if (!this.isRangeMetric(metric) && !metric.showPreviousValue) {
        this.metricsForm.get(`metric_${metric.id}`)?.reset();
      }
    }
    for (const dictionary of this.allDictionaries.filter(d => !d.isHidden)) {
      this.dictionariesForm.get(`dictionary_${dictionary.id}`)?.reset('');
    }
  }

  async updateLastActivityData() {
    const lastActivityData = await this.getLastActivityData();

    this.activityForm.patchValue({
      ...lastActivityData,
    });
  }

  async getLastActivityData() {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(addDays(new Date(currentDate), -1), 'yyyy-MM-dd');
    const lastActivity = await this.activityService.getLastEnriched();

    if (!lastActivity) {
      return {};
    }

    let startTime = this.currentTime;
    let date = currentDate;

    if (lastActivity.date == currentDate && lastActivity.endTime) {
      startTime = lastActivity.endTime;
    }

    if (
      lastActivity.date
      && yesterday == lastActivity.date
      && lastActivity.endTime
    ) {
      startTime = lastActivity.endTime;

      if (lastActivity.endTime > lastActivity.startTime) {
        date = lastActivity.date;
      }
    }

    return {
      startTime,
      date,
    };
  }

  setActivityData(activity: IActivity) {
    this.activityForm.patchValue({
      actions: entitiesToString(activity.actions),
      startTime: activity.startTime,
      endTime: activity.endTime,
      comment: activity.comment,
      date: activity.date,
      tags: entitiesToString(activity.tags),
    });
  }

  async updateActionCaretAndText(event: any) {
    const indexBefore = getPartIndex(this.actionInputText, this.actionInputCaretPosition);

    this.actionInputText = event.target.value;
    const nativeInput = await this.actionInput.getInputElement();
    this.actionInputCaretPosition = nativeInput.selectionStart ?? 0;
    const indexAfter = getPartIndex(this.actionInputText, this.actionInputCaretPosition);

    if (indexBefore !== indexAfter) {
      this.hideActionSuggestions();
    }
  }

  async onActionsInput(event: any) {
    await this.updateActionCaretAndText(event);

    const parts = this.actionInputText
      .split(',')
      .map((suggestion: string) => suggestion.toLowerCase().trim());

    const currentIndex = getPartIndex(this.actionInputText, this.actionInputCaretPosition);
    const current = parts[currentIndex];

    parts.splice(currentIndex, 1);

    if (current.length > 0) {
      this.filteredActionSuggestions = this.allActionSuggestions
        .filter((suggestion) =>
          suggestion.toLowerCase().includes(current)
          && !parts.includes(suggestion.toLowerCase())
        )
        .slice(0, 5);
      this.showActionSuggestions = this.filteredActionSuggestions.length > 0;
    } else {
      this.hideActionSuggestions();
    }
  }

  selectSuggestion(suggestion: string) {
    const actionsText = this.activityForm.get('actions')?.value;

    if (!actionsText) {
      return;
    }

    const currentIndex = getPartIndex(actionsText, this.actionInputCaretPosition);
    let parts = actionsText.split(',') ?? [];

    if (!parts.length) {
      return;
    }

    parts[currentIndex] = ' ' + suggestion;
    this.activityForm.patchValue({
      actions: parts.join(',').trim(),
    });

    this.hideActionSuggestions();
  }

  hideActionSuggestions() {
    setTimeout(() => (this.showActionSuggestions = false), 200);
  }

  isCurrentTime(time: string) {
    return this.currentTime == time;
  }

  updateEndTime(event: Event) {
    event.preventDefault();

    this.activityForm.patchValue({
      endTime: this.currentTime,
    });

    this.activityForm.get('endTime')?.markAsUntouched();
  }
}
