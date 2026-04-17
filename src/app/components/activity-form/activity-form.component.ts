import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IonInput, IonItem, IonLabel, IonTextarea, IonList, IonIcon, IonAccordionGroup, IonAccordion, IonRange, IonCheckbox, IonButton, IonModal, IonSearchbar, IonHeader, IonContent, IonToolbar, IonTitle, IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, close } from 'ionicons/icons';
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
import { IItemMetricDb } from 'src/app/db/models/item-metric';
import { ActionMetricService } from 'src/app/services/action-metric.service';
import { ActionTagService } from 'src/app/services/action-tag.service';
import { TagService } from 'src/app/services/tag.service';
import { TagMetricService } from 'src/app/services/tag-metric.service';
import { ItemMetricService } from 'src/app/services/item-metric.service';
import { ItemService } from 'src/app/services/item.service';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { entitiesToString } from 'src/app/functions/string';
import { ActionService } from 'src/app/services/action.service';
import { MetricService } from 'src/app/services/metric.service';
import { IMetric } from 'src/app/db/models/metric';
import { tagsValidator } from 'src/app/validators/tags.validator';
import { duplicatedItemsValidator } from 'src/app/validators/duplicated-items.validator';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { TagInputComponent } from '../../form-elements/tag-input/tag-input.component';
import { ListService } from 'src/app/services/list.service';
import { ActionListService } from 'src/app/services/action-list.service';
import { IList } from 'src/app/db/models/list';
import { IActionListDb } from 'src/app/db/models/action-list';
import { ListInputComponent } from '../../form-elements/list-input/list-input.component';

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
  imports: [IonButton, IonButtons, IonTitle, IonToolbar, IonContent, IonHeader, IonSearchbar, IonModal, IonRange, IonCheckbox, IonAccordion, IonAccordionGroup, IonIcon, IonList, IonTextarea, IonLabel, IonItem, IonInput, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, MaskitoDirective, ValidationErrorDirective, TagInputComponent, ListInputComponent],
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
  private itemMetricService = inject(ItemMetricService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private actionListService = inject(ActionListService);
  private allMetrics: IMetric[] = [];
  private allActionMetrics: IActionMetricDb[] = [];
  private allTagMetrics: ITagMetricDb[] = [];
  private allItemMetrics: IItemMetricDb[] = [];
  private allActionTags: IActionTagDb[] = [];
  private allTags: ITagDb[] = [];
  private allActions: IActionDb[] = [];
  private allLists: IList[] = [];
  private allActionLists: IActionListDb[] = [];
  // listId -> (lowerCaseName -> itemId)
  private itemLookup = new Map<number, Map<string, number>>();

  @Input() activityItemValues: Record<number, string> = {};

  public activityForm: ModelFormGroup<ActivityForm>;
  public metricsForm: FormGroup = this.formBuilder.group({});
  public listsForm: FormGroup = this.formBuilder.group({});
  public standaloneMetrics: IMetric[] = [];
  public standaloneLists: IList[] = [];
  public metricEnabled: Record<string, boolean> = {};

  manuallyAddedMetricIds = new Set<number>();
  manuallyAddedListIds = new Set<number>();
  metricsGroupOpen = this.loadGroupState('metrics', true);
  listsGroupOpen = this.loadGroupState('lists', true);
  isAddLibraryModalOpen = false;
  modalFilterType: 'metric' | 'list' = 'metric';
  librarySearchQuery = '';
  librarySearchResults: { type: 'metric' | 'list'; id: number; name: string }[] = [];

  filteredActionSuggestions: string[] = [];
  private allActionSuggestions: string[] = [];
  showActionSuggestions = false;

  private currentTime: string = '00:00';

  constructor() {
    addIcons({ add, close });
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

  get manuallyAddedMetricsNotInStandalone(): IMetric[] {
    const standaloneIds = new Set(this.standaloneMetrics.map(m => m.id));
    return this.allMetrics.filter(m =>
      this.manuallyAddedMetricIds.has(m.id) && !standaloneIds.has(m.id)
    );
  }

  get manuallyAddedListsNotInStandalone(): IList[] {
    const standaloneIds = new Set(this.standaloneLists.map(l => l.id));
    return this.allLists.filter(l =>
      this.manuallyAddedListIds.has(l.id) && !standaloneIds.has(l.id)
    );
  }

  get hasAnyMetrics(): boolean {
    return this.standaloneMetrics.length > 0 || this.manuallyAddedMetricsNotInStandalone.length > 0;
  }

  get hasAnyLists(): boolean {
    return this.standaloneLists.length > 0 || this.manuallyAddedListsNotInStandalone.length > 0;
  }

  async refreshMetricsAndLists() {
    await this.loadMetrics();
    await this.loadLists();
    this.initManuallyLinked();
  }

  initManuallyLinked() {
    const standaloneMetricIds = new Set(this.standaloneMetrics.map(m => m.id));
    for (const metricIdStr of Object.keys(this.activityMetricValues ?? {})) {
      const metricId = Number(metricIdStr);
      const metric = this.allMetrics.find(m => m.id === metricId);
      if (metric && !standaloneMetricIds.has(metricId)) {
        this.manuallyAddedMetricIds.add(metricId);
        this.metricEnabled[`metric_${metricId}`] = true;
      }
    }

    const standaloneListIds = new Set(this.standaloneLists.map(l => l.id));
    for (const [listIdStr, value] of Object.entries(this.activityItemValues ?? {})) {
      const listId = Number(listIdStr);
      const list = this.allLists.find(l => l.id === listId && !l.isHidden);
      if (list && !standaloneListIds.has(listId) && value) {
        this.manuallyAddedListIds.add(listId);
      }
    }
  }

  openAddMetricModal(event: Event) {
    event.stopPropagation();
    this.modalFilterType = 'metric';
    this.isAddLibraryModalOpen = true;
    this.librarySearchQuery = '';
    this.updateLibrarySearch();
  }

  openAddListModal(event: Event) {
    event.stopPropagation();
    this.modalFilterType = 'list';
    this.isAddLibraryModalOpen = true;
    this.librarySearchQuery = '';
    this.updateLibrarySearch();
  }

  onLibrarySearch(event: any) {
    this.librarySearchQuery = event.detail.value ?? '';
    this.updateLibrarySearch();
  }

  updateLibrarySearch() {
    const query = this.librarySearchQuery.toLowerCase();

    if (this.modalFilterType === 'metric') {
      const standaloneMetricIds = new Set(this.standaloneMetrics.map(m => m.id));
      this.librarySearchResults = this.allMetrics
        .filter(m =>
          !standaloneMetricIds.has(m.id) &&
          !this.manuallyAddedMetricIds.has(m.id) &&
          (!query || this.translate.instant(m.name).toLowerCase().includes(query))
        )
        .map(m => ({ type: 'metric' as const, id: m.id, name: m.name }));
    } else {
      const standaloneListIds = new Set(this.standaloneLists.map(l => l.id));
      this.librarySearchResults = this.allLists
        .filter(l =>
          !l.isHidden &&
          !standaloneListIds.has(l.id) &&
          !this.manuallyAddedListIds.has(l.id) &&
          (!query || this.translate.instant(l.name).toLowerCase().includes(query))
        )
        .map(l => ({ type: 'list' as const, id: l.id, name: l.name }));
    }
  }

  selectLibraryItem(item: { type: 'metric' | 'list'; id: number; name: string }) {
    if (item.type === 'metric') {
      this.addManualMetric(item.id);
    } else {
      this.addManualList(item.id);
    }
    this.isAddLibraryModalOpen = false;
  }

  addManualMetric(metricId: number) {
    this.manuallyAddedMetricIds.add(metricId);
    this.metricEnabled[`metric_${metricId}`] = true;
    this.metricsGroupOpen = true;
    this.saveGroupState('metrics', true);
  }

  removeManualMetric(metricId: number) {
    this.manuallyAddedMetricIds.delete(metricId);
    const key = `metric_${metricId}`;
    this.metricEnabled[key] = false;
    this.metricsForm.get(key)?.reset();
  }

  addManualList(listId: number) {
    this.manuallyAddedListIds.add(listId);
    this.listsGroupOpen = true;
    this.saveGroupState('lists', true);
  }

  removeManualList(listId: number) {
    this.manuallyAddedListIds.delete(listId);
    this.listsForm.get(`list_${listId}`)?.setValue('');
  }

  private loadGroupState(key: string, defaultOpen: boolean): boolean {
    const stored = localStorage.getItem(`activity-form:${key}-open`);
    return stored === null ? defaultOpen : stored === 'true';
  }

  private saveGroupState(key: string, open: boolean) {
    localStorage.setItem(`activity-form:${key}-open`, String(open));
  }

  onMetricsGroupChange(event: any) {
    this.metricsGroupOpen = !!event.detail.value;
    this.saveGroupState('metrics', this.metricsGroupOpen);
  }

  onListsGroupChange(event: any) {
    this.listsGroupOpen = !!event.detail.value;
    this.saveGroupState('lists', this.listsGroupOpen);
  }

  async ngOnInit() {
    await this.fetchAllSuggestions();
    await this.loadMetrics();
    await this.loadLists();

    this.activityForm.get('actions')!.valueChanges.subscribe(() => {
      this.updateVisibleMetrics();
      this.updateVisibleLists();
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
    [this.allActionMetrics, this.allTagMetrics, this.allItemMetrics, this.allActionTags, this.allTags] = await Promise.all([
      this.actionMetricService2.getAll(),
      this.tagMetricService.getAll(),
      this.itemMetricService.getAll(),
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
      const minVal = Number(metric.minValue);
      const maxVal = Number(metric.maxValue);
      const stepVal = Number(metric.step);
      const mid = (minVal + maxVal) / 2;
      const midRounded = isRange ? Math.round((mid - minVal) / stepVal) * stepVal + minVal : null;

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

    const enteredItemIds = new Set<number>();
    for (const list of this.allLists.filter(l => !l.isHidden)) {
      const value: string = this.listsForm.get(`list_${list.id}`)?.value ?? '';
      const lookup = this.itemLookup.get(list.id);
      if (!lookup) continue;
      for (const name of value.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)) {
        const itemId = lookup.get(name);
        if (itemId !== undefined) enteredItemIds.add(itemId);
      }
    }

    const actionLinkedIds = new Set(this.allActionMetrics.map(am => am.metricId));
    const tagLinkedIds = new Set(this.allTagMetrics.map(tm => tm.metricId));
    const itemLinkedIds = new Set(this.allItemMetrics.map(im => im.metricId));

    this.standaloneMetrics = this.allMetrics.filter(m => {
      if (!actionLinkedIds.has(m.id) && !tagLinkedIds.has(m.id) && !itemLinkedIds.has(m.id)) return true;
      if (actionLinkedIds.has(m.id) && this.allActionMetrics.some(am => am.metricId === m.id && selectedActionIds.has(am.actionId))) return true;
      if (tagLinkedIds.has(m.id) && this.allTagMetrics.some(tm => tm.metricId === m.id && relevantTagIds.has(tm.tagId))) return true;
      if (itemLinkedIds.has(m.id) && this.allItemMetrics.some(im => im.metricId === m.id && enteredItemIds.has(im.itemId))) return true;
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
    const standaloneIds = new Set(this.standaloneMetrics.map(m => m.id));
    const manualOnlyMetrics = this.allMetrics.filter(m =>
      this.manuallyAddedMetricIds.has(m.id) && !standaloneIds.has(m.id)
    );
    return [...this.standaloneMetrics, ...manualOnlyMetrics]
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

  async loadLists() {
    const allItems = await this.itemService.getAll();
    [this.allLists, this.allActionLists] = await Promise.all([
      this.listService.getAll(),
      this.actionListService.getAll(),
    ]);

    this.itemLookup = new Map();
    for (const item of allItems) {
      if (!this.itemLookup.has(item.listId)) {
        this.itemLookup.set(item.listId, new Map());
      }
      this.itemLookup.get(item.listId)!.set(item.name.toLowerCase(), item.id);
    }

    this.listsForm = this.formBuilder.group({});
    for (const list of this.allLists.filter(l => !l.isHidden)) {
      const initialValue = this.activityItemValues[list.id] ?? '';
      this.listsForm.addControl(`list_${list.id}`, this.formBuilder.control(initialValue));
    }

    this.listsForm.valueChanges.subscribe(() => this.updateVisibleMetrics());
    this.updateVisibleLists();
  }

  updateVisibleLists() {
    const actionsText = this.activityForm.get('actions')?.value ?? '';
    const selectedActionNames = new Set(
      actionsText.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    );
    const selectedActionIds = new Set(
      this.allActions.filter(a => selectedActionNames.has(a.name.toLowerCase())).map(a => a.id)
    );

    const actionLinkedIds = new Set(this.allActionLists.map(al => al.listId));

    this.standaloneLists = this.allLists.filter(l => {
      if (l.isHidden) return false;
      if (!actionLinkedIds.has(l.id)) return true;
      return this.allActionLists.some(al => al.listId === l.id && selectedActionIds.has(al.actionId));
    });
  }

  getListItemRecords(): { listId: number; itemNames: string[] }[] {
    const standaloneIds = new Set(this.standaloneLists.map(l => l.id));
    const manualOnlyLists = this.allLists.filter(l =>
      this.manuallyAddedListIds.has(l.id) && !standaloneIds.has(l.id)
    );
    return [...this.standaloneLists, ...manualOnlyLists]
      .map(l => ({
        listId: l.id,
        itemNames: (this.listsForm.get(`list_${l.id}`)?.value ?? '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
      }))
      .filter(r => r.itemNames.length > 0);
  }

  getListLabel(list: IList): string {
    return this.translate.instant(list.name);
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
    let lastActivityData = {};
    try {
      lastActivityData = await this.getLastActivityData();
    } catch {
      // use defaults
    }

    this.activityForm.patchValue({
      ...defaultData,
      ...lastActivityData,
    });
    for (const metric of this.standaloneMetrics) {
      if (!metric.showPreviousValue) {
        if (this.isRangeMetric(metric)) {
          const minVal = Number(metric.minValue);
          const maxVal = Number(metric.maxValue);
          const stepVal = Number(metric.step);
          const mid = (minVal + maxVal) / 2;
          const midRounded = Math.round((mid - minVal) / stepVal) * stepVal + minVal;
          this.metricsForm.get(`metric_${metric.id}`)?.setValue(midRounded);
        } else {
          this.metricsForm.get(`metric_${metric.id}`)?.reset();
        }
        this.metricEnabled[`metric_${metric.id}`] = false;
      }
    }
    for (const list of this.allLists.filter(l => !l.isHidden)) {
      this.listsForm.get(`list_${list.id}`)?.reset('');
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
