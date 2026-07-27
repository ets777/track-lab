import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, IonCheckbox } from '@ionic/angular/standalone';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IAction } from 'src/app/db/models/action';
import { ActionInputComponent } from 'src/app/form-elements/action-input/action-input.component';
import { ActionService } from 'src/app/services/action.service';
import { replacementValidator } from 'src/app/validators/replacement.validator';
import { ActivityActionService } from 'src/app/services/activity-action.service';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { LoadingService } from 'src/app/services/loading.service';
import { LogService } from 'src/app/services/log.service';

@Component({
  selector: 'app-action-replace',
  templateUrl: './action-replace.page.html',
  styleUrls: ['./action-replace.page.scss'],
  imports: [IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, NavButtonComponent, TranslateModule, ReactiveFormsModule, ActionInputComponent, IonCheckbox],
})
export class ActionReplacePage implements OnInit {
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private actionService = inject(ActionService);
  private activityActionService = inject(ActivityActionService);
  private alertController = inject(AlertController);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private logService = inject(LogService);

  public replaceForm!: FormGroup;
  public excludedActions: string[] = [];

  hasRelation: boolean = false;
  currentActionId: number;
  currentAction?: IAction;

  private actions: IAction[] = [];

  constructor() {
    this.currentActionId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ngOnInit() {
    this.currentAction = await this.actionService.getEnriched(
      this.currentActionId
    );

    const relations = await this.activityActionService.getByActionId(this.currentActionId);

    this.hasRelation = !!(relations.length);

    this.replaceForm = this.formBuilder.group({
      newAction: [
        '',
        [
          Validators.required,
          replacementValidator(this.currentAction),
        ],
      ],
      deleteOldAction: [false],
    });

    await this.loadSuggestions();
  }

  async replaceAction() {
    const newActionId = this.findActionByName(this.replaceForm.value.newAction)?.id;

    if (!newActionId || !this.currentActionId) {
      return;
    }

    const confirmation = await this.askConfirmation();

    if (!confirmation) {
      return;
    }

    this.loadingService.show('TK_LOADING');

    try {
      await this.activityActionService.replaceAction(
        this.currentActionId,
        newActionId,
      );

      if (this.replaceForm.value.deleteOldAction) {
        await this.actionService.deleteWithRelations(this.currentActionId);
      }
    } catch (error) {
      await this.logService.error('ActionReplacePage.replaceAction', error);
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      return;
    } finally {
      this.loadingService.hide();
    }

    this.toastService.enqueue({
      title: 'TK_ACTION_REPLACED_SUCCESSFULLY',
      type: 'success',
    });

    await this.router.navigate(['/actions']);
  }

  async askConfirmation(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_CONFIRMATION'),
      subHeader: this.translate.instant('TK_THE_REPLACEMENT_PROCESS_IS_IRREVERSIBLE_DO_YOU_WANT_TO_CONTINUE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });

    await alert.present();

    const { role } = await alert.onDidDismiss();

    return role === 'yes';
  }

  isFormValid() {
    return this.replaceForm?.valid;
  }

  async loadSuggestions() {
    this.actions = await this.actionService.getAllEnriched();
    this.excludedActions = this.currentAction ? [this.currentAction.name] : [];
  }

  private findActionByName(name?: string): IAction | undefined {
    const trimmed = name?.trim().toLowerCase();

    if (!trimmed) {
      return undefined;
    }

    return this.actions.find(action => action.name.toLowerCase() === trimmed);
  }

  getFormText() {
    return this.translate.instant(
      'TK_REPLACE_ALL_OCCURRENCES_OF_THE_ACTION_ACTIONNAME_WITH',
      { actionName: this.currentAction?.name }
    );
  }
}
