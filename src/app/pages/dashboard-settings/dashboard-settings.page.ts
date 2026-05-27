import { Component, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonModal, IonList, IonItem, IonLabel, IonRadioGroup, IonRadio,
  IonCheckbox, IonSegment, IonSegmentButton, IonBackButton,
  ActionSheetController, AlertController,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  addOutline, ellipsisVertical, closeOutline, checkmarkOutline,
  addCircleOutline, shieldCheckmarkOutline, navigateOutline, analyticsOutline,
  libraryOutline, flaskOutline, timeOutline, barChartOutline, settingsOutline,
  trophyOutline, listOutline, pricetagOutline,
} from 'ionicons/icons';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { DashboardConfigService } from 'src/app/services/dashboard-config.service';
import { MetricService } from 'src/app/services/metric.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ExperimentService } from 'src/app/services/experiment.service';
import { ListService } from 'src/app/services/list.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import {
  DashboardWidget, WidgetConfig, WidgetType, WidgetPeriod,
  ActionButtonWidgetConfig, NavigationWidgetConfig, MetricGraphWidgetConfig,
  LibraryGraphWidgetConfig, ExperimentWidgetConfig,
  AVAILABLE_NAV_LINKS, NavigationLinkOption,
  getWidgetHeight, getMaxDashboardRows, WIDGET_COLORS, getNextColor,
} from 'src/app/types/dashboard-widget';
import { IMetric } from 'src/app/db/models/metric';
import { IExperiment } from 'src/app/db/models/experiment';
import { Selectable, CommonItem } from 'src/app/types/selectable';

interface RowSlot {
  type: 'widget' | 'empty';
  widget?: DashboardWidget;
  widgetIndex?: number;
  rowStart: number;
  rowSpan: 1 | 2;
}

type ModalStep = 'type' | 'form';

const WIDGET_TYPE_OPTIONS: { type: WidgetType; labelKey: string; icon: string }[] = [
  { type: 'action-button', labelKey: 'TK_WIDGET_ACTION_BUTTON', icon: 'add-circle-outline' },
  { type: 'rules',         labelKey: 'TK_WIDGET_RULES',         icon: 'shield-checkmark-outline' },
  { type: 'navigation',    labelKey: 'TK_WIDGET_NAVIGATION',    icon: 'navigate-outline' },
  { type: 'metric-graph',  labelKey: 'TK_WIDGET_METRIC_GRAPH',  icon: 'analytics-outline' },
  { type: 'library-graph', labelKey: 'TK_WIDGET_LIBRARY_GRAPH', icon: 'library-outline' },
  { type: 'experiment',    labelKey: 'TK_WIDGET_EXPERIMENT',    icon: 'flask-outline' },
];

const WIDGET_ICONS: Record<WidgetType, string> = {
  'action-button': 'add-circle-outline',
  'rules': 'shield-checkmark-outline',
  'navigation': 'navigate-outline',
  'metric-graph': 'analytics-outline',
  'library-graph': 'library-outline',
  'experiment': 'flask-outline',
};

@Component({
  selector: 'app-dashboard-settings-page',
  templateUrl: './dashboard-settings.page.html',
  styleUrl: './dashboard-settings.page.scss',
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonModal, IonList, IonItem, IonLabel, IonRadioGroup, IonRadio,
    IonCheckbox, IonSegment, IonSegmentButton, IonBackButton,
    TranslateModule, SelectSearchComponent,
  ],
})
export class DashboardSettingsPage {
  @ViewChild('configModal') configModal!: IonModal;

  private configService = inject(DashboardConfigService);
  private metricService = inject(MetricService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private experimentService = inject(ExperimentService);
  private listService = inject(ListService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private translate = inject(TranslateService);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);

  widgets: DashboardWidget[] = [];

  // modal state
  modalOpen = false;
  modalStep: ModalStep = 'type';
  modalEditingId: string | null = null;
  selectedWidgetType: WidgetType | null = null;

  // form state per type
  actionAction: 'new-activity' | 'new-action' | 'new-tag' = 'new-activity';
  selectedColor = WIDGET_COLORS[0];
  readonly widgetColors = WIDGET_COLORS;
  navSelectedRoutes: Set<string> = new Set();
  metricSuggestions: Selectable<IMetric>[] = [];
  selectedMetric: IMetric | null = null;
  metricPeriod: WidgetPeriod = '1w';
  itemSuggestions: Selectable<CommonItem>[] = [];
  selectedItem: CommonItem | null = null;
  itemPeriod: WidgetPeriod = '1w';
  experimentSuggestions: Selectable<IExperiment>[] = [];
  selectedExperiment: IExperiment | null = null;

  readonly availableNavLinks = AVAILABLE_NAV_LINKS;
  readonly widgetIcons = WIDGET_ICONS;
  readonly periods: { value: WidgetPeriod; labelKey: string }[] = [
    { value: '1w', labelKey: 'TK_PERIOD_1W' },
    { value: '2w', labelKey: 'TK_PERIOD_2W' },
    { value: '1m', labelKey: 'TK_PERIOD_1M' },
  ];

  constructor() {
    addIcons({
      addOutline, ellipsisVertical, closeOutline, checkmarkOutline,
      addCircleOutline, shieldCheckmarkOutline, navigateOutline, analyticsOutline,
      libraryOutline, flaskOutline, timeOutline, barChartOutline, settingsOutline,
      trophyOutline, listOutline, pricetagOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    this.widgets = await this.configService.getWidgets();
  }

  private get storedRuleCount(): number {
    return parseInt(localStorage.getItem('dashboard_rules_count') ?? '4', 10);
  }

  private widgetHeight(config: WidgetConfig): 1 | 2 {
    return getWidgetHeight(config, config.type === 'rules' ? this.storedRuleCount : undefined);
  }

  get maxRows(): number {
    return getMaxDashboardRows(window.innerHeight);
  }

  get remainingRows(): number {
    const used = this.widgets.reduce((sum, w) => sum + this.widgetHeight(w.config), 0);
    return this.maxRows - used;
  }

  get effectiveRemainingRows(): number {
    if (this.modalEditingId) {
      const editing = this.widgets.find(w => w.id === this.modalEditingId);
      if (editing) return this.remainingRows + this.widgetHeight(editing.config);
    }
    return this.remainingRows;
  }

  get navMaxLinks(): number {
    return this.effectiveRemainingRows <= 1 ? 3 : 6;
  }

  get widgetTypeOptions() {
    if (this.remainingRows >= 2) return WIDGET_TYPE_OPTIONS;
    const twoRowTypes: WidgetType[] = ['rules', 'metric-graph', 'library-graph', 'experiment'];
    return WIDGET_TYPE_OPTIONS.filter(opt => !twoRowTypes.includes(opt.type));
  }

  get rowSlots(): RowSlot[] {
    const max = this.maxRows;
    const slots: RowSlot[] = [];
    let currentRow = 1;
    for (const widget of this.widgets) {
      const rowSpan = this.widgetHeight(widget.config);
      slots.push({ type: 'widget', widget, rowStart: currentRow, rowSpan });
      currentRow += rowSpan;
    }
    while (currentRow <= max) {
      slots.push({ type: 'empty', rowStart: currentRow, rowSpan: 1 });
      currentRow++;
    }
    return slots;
  }

  getWidgetLabel(widget: DashboardWidget): string {
    const cfg = widget.config;
    if (cfg.type === 'action-button') {
      const actionKey = `TK_ACTION_${(cfg as ActionButtonWidgetConfig).action.replace(/-/g, '_').toUpperCase()}`;
      return this.translate.instant(actionKey);
    }
    if (cfg.type === 'rules') return this.translate.instant('TK_WIDGET_RULES');
    if (cfg.type === 'navigation') {
      const links = (cfg as NavigationWidgetConfig).links.length;
      return `${this.translate.instant('TK_WIDGET_NAVIGATION')} (${links})`;
    }
    if (cfg.type === 'metric-graph') return (cfg as MetricGraphWidgetConfig).metricName;
    if (cfg.type === 'library-graph') return (cfg as LibraryGraphWidgetConfig).itemName;
    if (cfg.type === 'experiment') return (cfg as ExperimentWidgetConfig).experimentTitle;
    return '';
  }

  getWidgetIcon(widget: DashboardWidget): string {
    return WIDGET_ICONS[widget.config.type] ?? 'square-outline';
  }

  async onEmptySlotTap(): Promise<void> {
    this.resetModalState();
    this.modalStep = 'type';
    this.modalEditingId = null;
    this.modalOpen = true;
  }

  async onWidgetMenuTap(widget: DashboardWidget, event: Event): Promise<void> {
    event.stopPropagation();
    const sheet = await this.actionSheetCtrl.create({
      buttons: [
        ...(widget.config.type !== 'rules' ? [{
          text: this.translate.instant('TK_EDIT'),
          handler: () => this.openEditModal(widget),
        }] : []),
        {
          text: this.translate.instant('TK_MOVE_UP'),
          handler: () => this.moveWidget(widget.id, 'up'),
        },
        {
          text: this.translate.instant('TK_MOVE_DOWN'),
          handler: () => this.moveWidget(widget.id, 'down'),
        },
        {
          text: this.translate.instant('TK_DELETE'),
          role: 'destructive',
          handler: () => this.confirmDelete(widget),
        },
        { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private openEditModal(widget: DashboardWidget): void {
    this.resetModalState();
    this.modalEditingId = widget.id;
    this.selectedWidgetType = widget.config.type;
    this.prefillForm(widget.config);
    this.loadFormData(widget.config.type);
    this.modalStep = 'form';
    this.modalOpen = true;
  }

  private prefillForm(config: WidgetConfig): void {
    if (config.type === 'action-button') {
      const c = config as ActionButtonWidgetConfig;
      this.actionAction = c.action;
      this.selectedColor = c.color ?? getNextColor(this.widgets);
    }
    if (config.type === 'navigation') {
      this.navSelectedRoutes = new Set((config as NavigationWidgetConfig).links.map(l => l.route));
    }
    if (config.type === 'metric-graph') {
      const c = config as MetricGraphWidgetConfig;
      this.metricPeriod = c.period;
      this.selectedColor = c.color ?? getNextColor(this.widgets);
    }
    if (config.type === 'library-graph') {
      const c = config as LibraryGraphWidgetConfig;
      this.itemPeriod = c.period;
      this.selectedColor = c.color ?? getNextColor(this.widgets);
    }
  }

  selectWidgetType(type: WidgetType): void {
    this.selectedWidgetType = type;
    if (['action-button', 'metric-graph', 'library-graph'].includes(type)) {
      this.selectedColor = getNextColor(this.widgets);
    }
    if (type === 'rules') {
      this.saveWidget();
      return;
    }
    this.loadFormData(type);
    this.modalStep = 'form';
  }

  private async loadFormData(type: WidgetType): Promise<void> {
    try {
      if (type === 'metric-graph') {
        const metrics = await this.metricService.getAll() as IMetric[];
        this.metricSuggestions = metrics
          .filter(m => !m.isHidden)
          .map((m, i) => ({ num: i, title: this.translate.instant(m.name), item: m }));
        if (this.modalEditingId) {
          const w = this.widgets.find(x => x.id === this.modalEditingId);
          if (w && w.config.type === 'metric-graph') {
            const cfg = w.config as MetricGraphWidgetConfig;
            const found = this.metricSuggestions.find(s => s.item.id === cfg.metricId) ?? null;
            this.selectedMetric = found?.item ?? null;
          }
        }
      }
      if (type === 'library-graph') {
        const [actions, tags, items, lists] = await Promise.all([
          this.actionService.getAllUnhidden(),
          this.tagService.getAllUnhidden(),
          this.itemService.getAllUnhidden(),
          this.listService.getAll(),
        ]);
        const mapped: Selectable<CommonItem>[] = [
          ...actions.map((a, i) => ({ num: i, title: a.name, subtitle: this.translate.instant('TK_ACTION'), item: { itemId: a.id, name: a.name, type: 'action' as const } })),
          ...tags.map((t, i) => ({ num: actions.length + i, title: t.name, subtitle: this.translate.instant('TK_TAG'), item: { itemId: t.id, name: t.name, type: 'tag' as const } })),
          ...items.map((it, i) => {
            const list = lists.find(l => l.id === it.listId);
            const subtitle = list ? this.translate.instant(list.name) : this.translate.instant('TK_ITEM');
            return { num: actions.length + tags.length + i, title: it.name, subtitle, item: { itemId: it.id, name: it.name, type: 'item' as const } };
          }),
        ];
        this.itemSuggestions = mapped;
        if (this.modalEditingId) {
          const w = this.widgets.find(x => x.id === this.modalEditingId);
          if (w && w.config.type === 'library-graph') {
            const cfg = w.config as LibraryGraphWidgetConfig;
            const found = this.itemSuggestions.find(s => s.item.itemId === cfg.itemId && s.item.type === cfg.itemType) ?? null;
            this.selectedItem = found?.item ?? null;
          }
        }
      }
      if (type === 'experiment') {
        const experiments = await this.experimentService.getAll() as IExperiment[];
        this.experimentSuggestions = experiments
          .filter(e => !e.factEndDate)
          .map((e, i) => ({ num: i, title: e.title, item: e }));
        if (this.modalEditingId) {
          const w = this.widgets.find(x => x.id === this.modalEditingId);
          if (w && w.config.type === 'experiment') {
            const cfg = w.config as ExperimentWidgetConfig;
            const found = this.experimentSuggestions.find(s => s.item.id === cfg.experimentId) ?? null;
            this.selectedExperiment = found?.item ?? null;
          }
        }
      }
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('DashboardSettingsPage.loadFormData', e);
    }
  }

  isNavLinkSelected(route: string): boolean {
    return this.navSelectedRoutes.has(route);
  }

  toggleNavLink(route: string): void {
    if (this.navSelectedRoutes.has(route)) {
      this.navSelectedRoutes.delete(route);
    } else if (this.navSelectedRoutes.size < this.navMaxLinks) {
      this.navSelectedRoutes.add(route);
    }
  }

  canSave(): boolean {
    if (!this.selectedWidgetType) return false;
    if (this.selectedWidgetType === 'navigation') return this.navSelectedRoutes.size > 0;
    if (this.selectedWidgetType === 'metric-graph') return !!this.selectedMetric;
    if (this.selectedWidgetType === 'library-graph') return !!this.selectedItem;
    if (this.selectedWidgetType === 'experiment') return !!this.selectedExperiment;
    return true;
  }

  async saveWidget(): Promise<void> {
    if (!this.selectedWidgetType) return;
    const config = this.buildConfig();
    if (!config) return;

    if (this.modalEditingId) {
      await this.configService.updateWidget(this.modalEditingId, config);
    } else {
      await this.configService.addWidget(config);
    }

    this.widgets = await this.configService.getWidgets();
    this.closeModal();
  }

  private buildConfig(): WidgetConfig | null {
    switch (this.selectedWidgetType) {
      case 'action-button':
        return { type: 'action-button', action: this.actionAction, color: this.selectedColor };
      case 'rules':
        return { type: 'rules' };
      case 'navigation': {
        const links = AVAILABLE_NAV_LINKS.filter(l => this.navSelectedRoutes.has(l.route));
        if (!links.length) return null;
        return { type: 'navigation', links };
      }
      case 'metric-graph':
        if (!this.selectedMetric) return null;
        return {
          type: 'metric-graph',
          metricId: this.selectedMetric.id,
          metricName: this.translate.instant(this.selectedMetric.name),
          period: this.metricPeriod,
          color: this.selectedColor,
        };
      case 'library-graph':
        if (!this.selectedItem) return null;
        return {
          type: 'library-graph',
          itemId: this.selectedItem.itemId,
          itemName: this.selectedItem.name,
          itemType: this.selectedItem.type as 'action' | 'tag' | 'item',
          period: this.itemPeriod,
          color: this.selectedColor,
        };
      case 'experiment':
        if (!this.selectedExperiment) return null;
        return {
          type: 'experiment',
          experimentId: this.selectedExperiment.id,
          experimentTitle: this.selectedExperiment.title,
        };
      default:
        return null;
    }
  }

  private async moveWidget(id: string, dir: 'up' | 'down'): Promise<void> {
    if (dir === 'up') await this.configService.moveUp(id);
    else await this.configService.moveDown(id);
    this.widgets = await this.configService.getWidgets();
  }

  private async confirmDelete(widget: DashboardWidget): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('TK_DELETE'),
          role: 'destructive',
          handler: async () => {
            await this.configService.deleteWidget(widget.id);
            this.widgets = await this.configService.getWidgets();
            this.toastService.enqueue({ title: 'TK_WIDGET_DELETED', type: 'success' });
          },
        },
      ],
    });
    await alert.present();
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  private resetModalState(): void {
    this.selectedWidgetType = null;
    this.modalStep = 'type';
    this.modalEditingId = null;
    this.actionAction = 'new-activity';
    this.navSelectedRoutes = new Set();
    this.selectedMetric = null;
    this.metricPeriod = '1w';
    this.selectedItem = null;
    this.itemPeriod = '1w';
    this.selectedExperiment = null;
    this.metricSuggestions = [];
    this.itemSuggestions = [];
    this.experimentSuggestions = [];
  }

  getNavLinkOption(route: string): NavigationLinkOption | undefined {
    return AVAILABLE_NAV_LINKS.find(l => l.route === route);
  }

  getWidgetTypeKey(type: WidgetType): string {
    return `TK_WIDGET_${type.replace(/-/g, '_').toUpperCase()}`;
  }

  get modalFormTitle(): string {
    if (!this.selectedWidgetType) return '';
    return this.getWidgetTypeKey(this.selectedWidgetType);
  }
}
