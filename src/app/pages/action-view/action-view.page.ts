import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { IAction } from 'src/app/db/models/action';
import { IActivity } from 'src/app/db/models/activity';
import { ActionService } from 'src/app/services/action.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from 'src/app/services/activity.service';
import { ActivityActionService } from 'src/app/services/activity-action.service';
import { ActivityListComponent } from 'src/app/components/activity-list/activity-list.component';
import { Time } from 'src/app/Time';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TagsComponent } from "src/app/components/tags/tags.component";
import { DatePeriodInputComponent } from 'src/app/form-elements/date-period-input/date-period-input.component';
import { getTimeString } from 'src/app/functions/string';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { LoadingService } from 'src/app/services/loading.service';
import { LogService } from 'src/app/services/log.service';
@Component({
  selector: 'app-action-view',
  templateUrl: './action-view.page.html',
  styleUrls: ['./action-view.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, ActivityListComponent, BackButtonComponent, TagsComponent, DatePeriodInputComponent],
})
export class ActionViewPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private actionService = inject(ActionService);
  private activityService = inject(ActivityService);
  private activityActionService = inject(ActivityActionService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private logService = inject(LogService);
  private translate = inject(TranslateService);
  private formBuilder = inject(FormBuilder);
  private actionSheetCtrl = inject(ActionSheetController);

  actionId: number;
  action?: IAction;
  totalTimeMinutes: number = 0;
  activities: IActivity[] = [];
  activitiesGroupedByDate: {
    date: string,
    activities: IActivity[],
  }[] = [];

  filterForm = this.formBuilder.group({ datePeriod: [null as any] });

  actionSheetButtons = [
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_REPLACE'), data: { action: 'replace' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  constructor() {
    this.actionId = Number(this.route.snapshot.paramMap.get('id'));
    this.filterForm.valueChanges.subscribe(() => {
      if (this.filterForm.valid) {
        this.setActivitiesData();
      }
    });
  }

  ngOnInit() {
  }

  async openMenu() {
    const actionSheet = await this.actionSheetCtrl.create({ buttons: this.actionSheetButtons });
    await actionSheet.present();
    const { data } = await actionSheet.onWillDismiss();
    if (data?.action) await this.doAction(data.action);
  }

  async doAction(action: string) {
    switch (action) {
      case 'edit':
        await this.router.navigate(['/action/edit', this.actionId]);
        break;
      case 'replace':
        await this.replaceAction();
        break;
      case 'delete':
        await this.deleteAction();
        break;
    }
  }

  async replaceAction() {
    const relations = await this.activityActionService.getByActionId(this.actionId);
    if (!relations.length) {
      const answer = await this.showReplacementError();
      if (answer === 'delete') {
        await this.actionService.deleteWithRelations(this.actionId);
        await this.router.navigate(['/actions']);
      }
      return;
    }
    await this.router.navigate(['/action/replace', this.actionId]);
  }

  async deleteAction() {
    const relations = await this.activityActionService.getByActionId(this.actionId);
    if (relations.length) {
      const answer = await this.showDeletionError();
      if (answer === 'replace') await this.router.navigate(['/action/replace', this.actionId]);
      return;
    }
    if (await this.confirm()) {
      await this.actionService.deleteWithRelations(this.actionId);
      this.toastService.enqueue({ title: 'TK_ACTION_DELETED_SUCCESSFULLY', type: 'success' });
      await this.router.navigate(['/actions']);
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

  async ionViewDidEnter() {
    const action = await this.actionService.getEnriched(this.actionId);

    if (action) {
      this.action = action;
    }

    if (this.filterForm.valid) {
      await this.setActivitiesData();
    }
  }

  async setActivitiesData() {
    const { startDate, endDate } = this.filterForm.value.datePeriod ?? {};
    if (!startDate || !endDate) return;

    this.loadingService.show('TK_LOADING');

    try {
      const activities = await this.activityService.getByDate(startDate, endDate);

      this.activities = activities.filter(
        (activity) => activity.actions.find((action) => action.id == this.actionId),
      );

      const dates = [...new Set(this.activities.map((activity) => activity.date))].sort().reverse();

      this.activitiesGroupedByDate = dates
        .map((date) => ({
          date,
          activities: this.activities.filter((activity) => activity.date === date),
        }))
        .filter((day) => day.activities.length);

      const totalTimeSeconds = this.activities.reduce((sum, activity) => {
        let duration = new Time(activity.endTime).valueOf() - new Time(activity.startTime).valueOf();
        if (duration < 0) {
          duration += 24 * 60 * 60;
        }
        return sum + duration;
      }, 0);

      this.totalTimeMinutes = Math.floor(totalTimeSeconds / 60);
    } catch (error) {
      await this.logService.error('ActionViewPage.setActivitiesData', error);
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
    } finally {
      this.loadingService.hide();
    }
  }

  getTimeString(minutes: number) {
    return getTimeString(this.translate, minutes);
  }
}
