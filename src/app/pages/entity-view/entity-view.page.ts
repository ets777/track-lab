import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { addDays, format } from 'date-fns';
import { IActivity } from 'src/app/db/models/activity';
import { ITag } from 'src/app/db/models/tag';
import { ActionService } from 'src/app/services/action.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActivityActionService } from 'src/app/services/activity-action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ToastService } from 'src/app/services/toast.service';
import { LoadingService } from 'src/app/services/loading.service';
import { LogService } from 'src/app/services/log.service';
import { ActivityListComponent } from 'src/app/components/activity-list/activity-list.component';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TagsComponent } from 'src/app/components/tags/tags.component';
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { getActivityDurationMinutes } from 'src/app/functions/activity';
import { getTimeString } from 'src/app/functions/string';
import { MAX_DATE_RANGE_DAYS } from 'src/app/validators/max-date-range.validator';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';
import { IRule } from 'src/app/db/models/rule';
import { RuleService } from 'src/app/services/rule.service';

export type EntityType = 'action' | 'tag' | 'item';

@Component({
  selector: 'app-entity-view',
  templateUrl: './entity-view.page.html',
  styleUrls: ['./entity-view.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon,
    CommonModule, FormsModule, ReactiveFormsModule, TranslateModule,
    ActivityListComponent, BackButtonComponent, TagsComponent,
    DatePeriodInputComponent, BaseChartDirective, DefaultSkeletonComponent,
  ],
})
export class EntityViewPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private actionService = inject(ActionService);
  private activityService = inject(ActivityService);
  private activityActionService = inject(ActivityActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private logService = inject(LogService);
  private translate = inject(TranslateService);
  private formBuilder = inject(FormBuilder);
  private actionSheetCtrl = inject(ActionSheetController);
  private ruleService = inject(RuleService);

  entityType: EntityType;
  entityId: number;
  entityName = '';
  actionTags: ITag[] = [];
  isLoading = true;

  totalTimeMinutes = 0;
  activities: IActivity[] = [];
  activitiesGroupedByDate: { date: string; activities: IActivity[] }[] = [];
  rules: IRule[] = [];
  chartData: ChartConfiguration<'bar'>['data'] | undefined = undefined;

  filterForm = this.formBuilder.group({ datePeriod: [null as any] });

  constructor() {
    this.entityType = this.route.snapshot.data['entityType'] as EntityType;
    this.entityId = Number(this.route.snapshot.paramMap.get('id'));

    this.filterForm.valueChanges.subscribe(() => {
      if (this.filterForm.valid) {
        this.setActivitiesData();
      }
    });
  }

  get titleKey(): string {
    switch (this.entityType) {
      case 'action': return 'TK_ACTION';
      case 'tag': return 'TK_TAG';
      case 'item': return 'TK_ITEM';
    }
  }

  get storageKey(): string {
    return `entity-view-${this.entityType}`;
  }

  get menuButtons() {
    const buttons: { text: string; role?: string; data: { action: string } }[] = [
      { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    ];
    if (this.entityType === 'action') {
      buttons.push({ text: this.translate.instant('TK_REPLACE'), data: { action: 'replace' } });
    }
    buttons.push({ text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } });
    return buttons;
  }

  ionViewWillEnter() {
    this.isLoading = true;
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));
    try {
      await Promise.all([this.loadEntity(), this.loadRules()]);
    } catch (error) {
      await this.logService.error('EntityViewPage.ionViewDidEnter', error);
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
    } finally {
      this.isLoading = false;
    }
    if (this.filterForm.valid) {
      await this.setActivitiesData();
    }
  }

  private async loadRules() {
    this.rules = await this.ruleService.getAll();
  }

  private async loadEntity() {
    switch (this.entityType) {
      case 'action': {
        const action = await this.actionService.getEnriched(this.entityId);
        if (action) {
          this.entityName = action.name;
          this.actionTags = action.tags;
        }
        break;
      }
      case 'tag': {
        const tag = await this.tagService.getById(this.entityId);
        if (tag) this.entityName = tag.name;
        break;
      }
      case 'item': {
        const item = await this.itemService.getById(this.entityId);
        if (item) this.entityName = item.name;
        break;
      }
    }
  }

  async openMenu() {
    const actionSheet = await this.actionSheetCtrl.create({ buttons: this.menuButtons });
    await actionSheet.present();
    const { data } = await actionSheet.onWillDismiss();
    if (data?.action) await this.doAction(data.action);
  }

  async doAction(action: string) {
    switch (action) {
      case 'edit':
        await this.router.navigate([`/${this.entityType}/edit`, this.entityId]);
        break;
      case 'replace':
        await this.replaceAction();
        break;
      case 'delete':
        await this.deleteEntity();
        break;
    }
  }

  async replaceAction() {
    const relations = await this.activityActionService.getByActionId(this.entityId);
    if (!relations.length) {
      const answer = await this.showReplacementError();
      if (answer === 'delete') {
        await this.actionService.deleteWithRelations(this.entityId);
        await this.router.navigate(['/actions']);
      }
      return;
    }
    await this.router.navigate(['/action/replace', this.entityId]);
  }

  async deleteEntity() {
    if (this.entityType === 'action') {
      const relations = await this.activityActionService.getByActionId(this.entityId);
      if (relations.length) {
        const answer = await this.showDeletionError();
        if (answer === 'replace') await this.router.navigate(['/action/replace', this.entityId]);
        return;
      }
    }

    if (!await this.confirm()) return;

    switch (this.entityType) {
      case 'action':
        await this.actionService.deleteWithRelations(this.entityId);
        this.toastService.enqueue({ title: 'TK_ACTION_DELETED_SUCCESSFULLY', type: 'success' });
        await this.router.navigate(['/actions']);
        break;
      case 'tag':
        await this.tagService.deleteWithRelations(this.entityId);
        this.toastService.enqueue({ title: 'TK_TAG_DELETED_SUCCESSFULLY', type: 'success' });
        await this.router.navigate(['/tag-list']);
        break;
      case 'item':
        await this.itemService.delete({ id: this.entityId });
        this.toastService.enqueue({ title: 'TK_ITEM_DELETED_SUCCESSFULLY', type: 'success' });
        await this.router.navigate(['/item-list']);
        break;
    }
  }

  async showDeletionError(): Promise<string> {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_CAN_T_PROCEED'),
      subHeader: this.translate.instant('TK_THE_ACTION_CAN_T_BE_DELETED_BECAUSE_IT_HAS_OCCURRENCES_IN_THE_ACTIVITIES'),
      buttons: [
        { text: this.translate.instant('TK_REPLACE'), role: 'replace' },
        { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role!;
  }

  async showReplacementError(): Promise<string> {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_CAN_T_PROCEED'),
      subHeader: this.translate.instant('TK_THE_ACTION_WAS_NEVER_PERFORMED_THERE_IS_NOTHING_TO_REPLACE'),
      buttons: [
        { text: this.translate.instant('TK_DELETE'), role: 'delete' },
        { text: this.translate.instant('TK_CANCEL'), role: 'cancel' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role!;
  }

  async confirm(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'yes';
  }

  async setActivitiesData() {
    const { startDate, endDate } = this.filterForm.value.datePeriod ?? {};
    if (!startDate || !endDate) return;

    this.loadingService.show('TK_LOADING');

    try {
      const allActivities = await this.activityService.getByDate(startDate, endDate);

      this.activities = allActivities.filter(a => this.activityMatchesEntity(a));

      const dates = [...new Set(this.activities.map(a => a.date))].sort().reverse();
      this.activitiesGroupedByDate = dates
        .map(date => ({
          date,
          activities: this.activities.filter(a => a.date === date),
        }))
        .filter(day => day.activities.length);

      this.totalTimeMinutes = this.activities.reduce(
        (sum, a) => sum + getActivityDurationMinutes(a),
        0,
      );

      this.buildChartData(startDate, endDate, allActivities);
    } catch (error) {
      await this.logService.error('EntityViewPage.setActivitiesData', error);
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
    } finally {
      this.loadingService.hide();
    }
  }

  private activityMatchesEntity(activity: IActivity): boolean {
    switch (this.entityType) {
      case 'action':
        return activity.actions.some(a => a.id === this.entityId);
      case 'tag':
        return activity.tags.some(t => t.id === this.entityId)
          || activity.actions.some(a => a.tags.some(t => t.id === this.entityId));
      case 'item':
        return activity.items.some(i => i.id === this.entityId);
    }
  }

  private buildChartData(startDate: string, endDate: string, allActivities: IActivity[]) {
    const dates: string[] = [];
    let i = 0;
    while (!dates.includes(endDate)) {
      dates.push(format(addDays(new Date(startDate), i), 'yyyy-MM-dd'));
      i++;
      if (i > MAX_DATE_RANGE_DAYS) break;
    }

    const durationData = dates.map(date => {
      const dayActivities = allActivities.filter(a => a.date === date && this.activityMatchesEntity(a));
      return dayActivities.reduce((sum, a) => sum + getActivityDurationMinutes(a), 0);
    });

    const units = '(' + this.translate.instant('TK_M') + '.)';
    const timeLabel = this.translate.instant('TK_TIME') + ' ' + units;

    this.chartData = {
      labels: dates,
      datasets: [{ data: durationData, label: timeLabel }],
    };
  }

  getTimeString(minutes: number) {
    return getTimeString(this.translate, minutes);
  }
}
