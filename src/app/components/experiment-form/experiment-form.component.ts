import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { IonInput, IonIcon, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SelectionSheetComponent, SelectionSheetItem, SelectionSheetCreateOption } from '../selection-sheet/selection-sheet.component';
import { CreateEntitySheetComponent, CreateEntityType, CreatedEntity } from '../create-entity-sheet/create-entity-sheet.component';
import { CreateRuleSheetComponent, CreatedRule } from '../create-rule-sheet/create-rule-sheet.component';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IExperiment } from 'src/app/db/models/experiment';
import { reservedPrefixValidator } from 'src/app/validators/reserved-prefix.validator';
import { DatePeriod } from 'src/app/types/date-period';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { IMetric } from 'src/app/db/models/metric';
import { MetricService } from 'src/app/services/metric.service';
import { RuleService } from 'src/app/services/rule.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ListService } from 'src/app/services/list.service';
import { ActivityService } from 'src/app/services/activity.service';
import { AppConfigService } from 'src/app/services/app-config.service';
import { ToastService } from 'src/app/services/toast.service';
import { TooltipService } from 'src/app/services/tooltip.service';
import { LogService } from 'src/app/services/log.service';
import { ExperimentDirection } from 'src/app/db/models/experiment-metric';
import { CommonItem } from 'src/app/types/selectable';
import { filterUniqueElements } from 'src/app/functions/item';
import { format, addMonths, subDays, parseISO } from 'date-fns';

export type ExperimentForm = {
  title: string;
  datePeriod: DatePeriod | null;
};

export type ExperimentEntry = {
  type: 'metric' | 'action' | 'tag' | 'item';
  subjectId: number;
  direction: ExperimentDirection;
};

type EntryItem = { commonItem: CommonItem; displayName: string; subtitle: string };

@Component({
  selector: 'app-experiment-form',
  templateUrl: './experiment-form.component.html',
  styleUrls: ['./experiment-form.component.scss'],
  imports: [
    IonInput, IonIcon, IonSegment, IonSegmentButton,
    FormsModule, ReactiveFormsModule, TranslateModule,
    CommonModule, DatePeriodInputComponent, SelectionSheetComponent,
    CreateEntitySheetComponent, CreateRuleSheetComponent,
  ],
})
export class ExperimentFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private metricService = inject(MetricService);
  private ruleService = inject(RuleService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private activityService = inject(ActivityService);
  private appConfigService = inject(AppConfigService);
  private tooltip = inject(TooltipService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private translate = inject(TranslateService);

  /** Set once the user dismisses the primer, so it never returns. */
  private static readonly INTRO_DISMISSED_KEY = 'experiment.introDismissed';

  @Input() experiment?: IExperiment;
  @Input() initialEntries: ExperimentEntry[] = [];
  @Input() initialRuleIds: number[] = [];

  public submitted = false;
  public showIntro = false;
  public experimentForm!: ModelFormGroup<ExperimentForm>;

  entries: ExperimentEntry[] = [];
  selectedRuleIds: number[] = [];
  initialValueMap: Record<string, string> = {};

  isModalOpen = false;
  modalType: 'entry' | 'rule' = 'entry';
  isCreateOpen = false;
  isCreateRuleOpen = false;
  createType: CreateEntityType = 'metric';
  searchQuery = '';
  entryModalResults: EntryItem[] = [];
  ruleModalResults: { id: number; name: string }[] = [];

  private allEntryItems: EntryItem[] = [];
  private allRuleItems: { id: number; name: string }[] = [];
  private allMetrics: IMetric[] = [];

  get modalItems(): SelectionSheetItem[] {
    if (this.modalType === 'entry') {
      return this.entryModalResults.map(ei => ({
        id: `${ei.commonItem.type}:${ei.commonItem.itemId}`,
        title: ei.displayName,
        subtitle: ei.subtitle,
        data: ei,
      }));
    }
    return this.ruleModalResults.map(r => ({ id: r.id, title: r.name, data: r }));
  }

  private static readonly ENTRY_CREATE_OPTIONS: SelectionSheetCreateOption[] = [
    { type: 'metric', label: 'TK_NEW_METRIC' },
    { type: 'action', label: 'TK_NEW_ACTION' },
    { type: 'tag', label: 'TK_NEW_TAG' },
    { type: 'item', label: 'TK_NEW_ITEM' },
  ];

  private static readonly RULE_CREATE_OPTIONS: SelectionSheetCreateOption[] = [
    { type: 'rule', label: 'TK_NEW_RULE' },
  ];

  get sheetCreateOptions(): SelectionSheetCreateOption[] {
    return this.modalType === 'entry'
      ? ExperimentFormComponent.ENTRY_CREATE_OPTIONS
      : ExperimentFormComponent.RULE_CREATE_OPTIONS;
  }

  onSheetSearch(query: string) {
    this.searchQuery = query;
    this.updateSearch();
  }

  /** Swap the picker for the create sheet; the created entity gets selected on the way back. */
  onCreateRequested(option: SelectionSheetCreateOption) {
    this.isModalOpen = false;

    if (option.type === 'rule') {
      this.isCreateRuleOpen = true;
      return;
    }

    this.createType = option.type as CreateEntityType;
    this.isCreateOpen = true;
  }

  async onEntityCreated(entity: CreatedEntity) {
    this.isCreateOpen = false;
    await this.loadSuggestions();
    // Experiments never offer 'list' as a create option, so the type is always an entry type.
    this.entries = [...this.entries, { type: entity.type as ExperimentEntry['type'], subjectId: entity.id, direction: 'any' }];
    this.computeInitialValues();
  }

  async onRuleCreated(rule: CreatedRule) {
    this.isCreateRuleOpen = false;
    await this.loadSuggestions();
    this.selectRuleItem(rule);
  }

  closeCreateSheet() {
    this.isCreateOpen = false;
  }

  closeCreateRuleSheet() {
    this.isCreateRuleOpen = false;
  }

  onSheetSelect(item: SelectionSheetItem) {
    if (this.modalType === 'entry') {
      this.selectEntryItem(item.data as EntryItem);
    } else {
      this.selectRuleItem(item.data as { id: number; name: string });
    }
  }

  /** Validate-on-submit: mark submitted, resolve pending async checks, return validity. */
  async validate(): Promise<boolean> {
    this.submitted = true;
    this.experimentForm.markAllAsTouched();

    if (this.experimentForm.pending) {
      await new Promise<void>((resolve) => {
        const sub = this.experimentForm.statusChanges.subscribe((status) => {
          if (status !== 'PENDING') {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    }

    return this.experimentForm.valid;
  }

  /** Show a field's validation sign only after submit was attempted. */
  showError(name: string): boolean {
    return this.submitted && !!this.experimentForm?.get(name)?.invalid;
  }

  /** Translate a single control's errors into user-facing messages. */
  fieldErrors(name: string): string[] {
    return this.messagesFor(this.experimentForm?.get(name)?.errors ?? null);
  }

  private messagesFor(errors: ValidationErrors | null): string[] {
    if (!errors) return [];

    const messages: string[] = [];
    if (errors['required']) messages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
    for (const key of Object.keys(errors)) {
      if (errors[key]?.message) {
        messages.push(this.translate.instant(errors[key].message, errors[key].params));
      }
    }

    return [...new Set(messages)];
  }

  get selectedRuleItems(): { id: number; name: string }[] {
    return this.selectedRuleIds.map(id => ({
      id,
      name: this.allRuleItems.find(r => r.id === id)?.name ?? String(id),
    }));
  }

  getEntryDisplayName(entry: ExperimentEntry): string {
    return this.allEntryItems.find(e => e.commonItem.type === entry.type && e.commonItem.itemId === entry.subjectId)?.displayName ?? String(entry.subjectId);
  }

  getEntrySubtitle(entry: ExperimentEntry): string {
    return this.allEntryItems.find(e => e.commonItem.type === entry.type && e.commonItem.itemId === entry.subjectId)?.subtitle ?? '';
  }

  async ngOnInit() {
    this.experimentForm = this.formBuilder.group({
      title: ['', [Validators.required, reservedPrefixValidator]],
      datePeriod: [null as DatePeriod | null],
    });

    this.experimentForm.get('datePeriod')?.valueChanges.subscribe(() => {
      this.computeInitialValues();
    });

    await this.loadSuggestions();
    await this.loadIntroState();

    if (this.experiment) {
      this.setExperimentData(this.experiment, this.initialEntries, this.initialRuleIds);
    } else {
      this.setDefaultData();
    }
  }

  /** The primer only helps while composing a first experiment, not while editing an existing one. */
  private async loadIntroState() {
    if (this.experiment) return;

    try {
      const dismissed = await this.appConfigService.get(ExperimentFormComponent.INTRO_DISMISSED_KEY);
      this.showIntro = dismissed !== 'true';
    } catch (e) {
      this.logService.error('ExperimentFormComponent.loadIntroState', e);
    }
  }

  async dismissIntro() {
    this.showIntro = false;

    try {
      await this.appConfigService.set(ExperimentFormComponent.INTRO_DISMISSED_KEY, 'true');
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('ExperimentFormComponent.dismissIntro', e);
    }
  }

  showIndicatorsTip(event: Event) {
    event.preventDefault();
    this.tooltip.show(event, this.translate.instant('TK_INDICATORS_TIP'));
  }

  showRulesTip(event: Event) {
    event.preventDefault();
    this.tooltip.show(event, this.translate.instant('TK_RULES_TIP'));
  }

  private async loadSuggestions() {
    const [metrics, rules, actions, tags, items, lists] = await Promise.all([
      this.metricService.getAll(),
      this.ruleService.getAll(),
      this.actionService.getAll(),
      this.tagService.getAll(),
      this.itemService.getAll(),
      this.listService.getAll(),
    ]);

    const itemListId = new Map(items.filter(i => !i.isHidden).map(i => [i.id, i.listId]));
    const listNameById = new Map(lists.map(l => [l.id, l.name]));

    const metricCommon: CommonItem[] = metrics.filter(m => !m.isHidden).map(m => ({ name: m.name, type: 'metric', itemId: m.id! }));
    const actionCommon: CommonItem[] = actions.filter(a => !a.isHidden).map(a => ({ name: a.name, type: 'action', itemId: a.id! }));
    const tagCommon: CommonItem[] = tags.filter(t => !t.isHidden).map(t => ({ name: t.name, type: 'tag', itemId: t.id! }));
    const itemCommon: CommonItem[] = items.filter(i => !i.isHidden).map(i => ({ name: i.name, type: 'item', itemId: i.id }));

    const all = filterUniqueElements([...metricCommon, ...actionCommon, ...tagCommon, ...itemCommon]);
    this.allEntryItems = all.map(ci => {
      const displayName = ci.type === 'metric' ? this.translate.instant(ci.name) : ci.name;
      let subtitle: string;
      if (ci.type === 'item') {
        const listId = itemListId.get(ci.itemId);
        const listName = listId !== undefined ? listNameById.get(listId) : undefined;
        subtitle = listName ? this.translate.instant(listName) : this.translate.instant('TK_ITEM');
      } else {
        subtitle = this.translate.instant('TK_' + ci.type.toUpperCase());
      }
      return { commonItem: ci, displayName, subtitle };
    });

    this.allMetrics = metrics;

    this.allRuleItems = rules.map(rule => {
      let subjectName = '';
      if (rule.subjectType === 'action') {
        subjectName = actions.find(a => a.id === rule.subjectId)?.name ?? '';
      } else if (rule.subjectType === 'tag') {
        subjectName = tags.find(t => t.id === rule.subjectId)?.name ?? '';
      } else {
        subjectName = items.find(i => i.id === rule.subjectId)?.name ?? '';
      }
      return { id: rule.id, name: this.ruleService.buildName(rule, subjectName) };
    });
  }

  setDefaultData() {
    this.submitted = false;
    const today = format(new Date(), 'yyyy-MM-dd');
    const endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
    this.experimentForm.patchValue({ title: '', datePeriod: { startDate: today, endDate } });
    this.entries = [];
    this.selectedRuleIds = [];
  }

  setExperimentData(experiment: IExperiment, entries: ExperimentEntry[], ruleIds: number[]) {
    this.submitted = false;
    const datePeriod = experiment.startDate && experiment.endDate
      ? { startDate: experiment.startDate, endDate: experiment.endDate }
      : null;
    this.experimentForm.patchValue({ title: experiment.title, datePeriod });
    this.entries = [...entries];
    this.selectedRuleIds = [...ruleIds];
  }

  // Entry group
  openEntryModal(event: Event) {
    event.stopPropagation();
    this.modalType = 'entry';
    this.searchQuery = '';
    this.updateSearch();
    this.isModalOpen = true;
  }

  removeEntry(entry: ExperimentEntry) {
    this.entries = this.entries.filter(e => !(e.type === entry.type && e.subjectId === entry.subjectId));
    this.computeInitialValues();
  }

  setEntryDirection(entry: ExperimentEntry, direction: ExperimentDirection) {
    entry.direction = direction;
  }

  // Rule group
  openRuleModal(event: Event) {
    event.stopPropagation();
    this.modalType = 'rule';
    this.searchQuery = '';
    this.updateSearch();
    this.isModalOpen = true;
  }

  removeRule(ruleId: number) {
    this.selectedRuleIds = this.selectedRuleIds.filter(id => id !== ruleId);
  }

  private updateSearch() {
    const q = this.searchQuery.toLowerCase();
    if (this.modalType === 'entry') {
      const selectedKeys = new Set(this.entries.map(e => `${e.type}:${e.subjectId}`));
      this.entryModalResults = this.allEntryItems.filter(ei =>
        !selectedKeys.has(`${ei.commonItem.type}:${ei.commonItem.itemId}`) &&
        (!q || ei.displayName.toLowerCase().includes(q))
      );
    } else {
      const selectedIds = new Set(this.selectedRuleIds);
      this.ruleModalResults = this.allRuleItems.filter(r =>
        !selectedIds.has(r.id) && (!q || r.name.toLowerCase().includes(q))
      );
    }
  }

  selectEntryItem(ei: EntryItem) {
    this.entries = [...this.entries, { type: ei.commonItem.type as ExperimentEntry['type'], subjectId: ei.commonItem.itemId, direction: 'any' }];
    this.isModalOpen = false;
    this.computeInitialValues();
  }

  selectRuleItem(rule: { id: number; name: string }) {
    this.selectedRuleIds = [...this.selectedRuleIds, rule.id];
    this.isModalOpen = false;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  getInitialValueLabel(entry: ExperimentEntry): string {
    const key = `${entry.type}:${entry.subjectId}`;
    if (!(key in this.initialValueMap)) return '';
    const value = this.initialValueMap[key];
    if (!value) return this.translate.instant('TK_INITIAL_VALUE_NO_DATA');
    const tkKey = entry.direction === 'increasing' ? 'TK_INITIAL_VALUE_INCREASING'
      : entry.direction === 'decreasing' ? 'TK_INITIAL_VALUE_DECREASING'
        : 'TK_INITIAL_VALUE_ANY';
    return this.translate.instant(tkKey, { value });
  }

  private async computeInitialValues() {
    const startDate = this.experimentForm.get('datePeriod')?.value?.startDate;
    if (!startDate) { this.initialValueMap = {}; return; }
    const weekEnd = startDate;
    const weekStart = format(subDays(parseISO(startDate), 6), 'yyyy-MM-dd');
    const activities = await this.activityService.getByDate(weekStart, weekEnd);
    const newMap: Record<string, string> = {};
    for (const entry of this.entries) {
      const key = `${entry.type}:${entry.subjectId}`;
      if (entry.type === 'metric') {
        const metric = this.allMetrics.find(m => m.id === entry.subjectId);
        if (!metric) continue;
        const values = activities
          .flatMap(a => a.metricRecords ?? [])
          .filter(r => r.metricId === metric.id && r.value != null)
          .map(r => r.value as number);
        if (!values.length) { newMap[key] = ''; continue; }
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        newMap[key] = `${Math.round(avg * 10) / 10}${metric.unit ? ' ' + metric.unit : ''}`;
      } else {
        const matching = activities.filter(a => {
          if (entry.type === 'action') return a.actions.some(ac => ac.id === entry.subjectId);
          if (entry.type === 'tag') return a.tags.some(t => t.id === entry.subjectId);
          return a.items.some(i => i.id === entry.subjectId);
        });
        const totalMin = matching.reduce((sum, a) => {
          if (!a.endTime) return sum;
          const [sh, sm] = a.startTime.split(':').map(Number);
          const [eh, em] = a.endTime.split(':').map(Number);
          return sum + Math.max(0, eh * 60 + em - sh * 60 - sm);
        }, 0);
        newMap[key] = totalMin > 0 ? `${Math.round(totalMin)} min` : '';
      }
    }
    this.initialValueMap = newMap;
  }
}
