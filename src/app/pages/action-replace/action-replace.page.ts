import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonCheckbox, IonItem } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IAction } from 'src/app/db/models/action';
import { Selectable, SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { ActionService } from 'src/app/services/action.service';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { replacementValidator } from 'src/app/validators/replacement.validator';
import { ActivityActionService } from 'src/app/services/activity-action.service';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';

@Component({
    selector: 'app-action-replace',
    templateUrl: './action-replace.page.html',
    styleUrls: ['./action-replace.page.scss'],
    imports: [IonItem, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, BackButtonComponent, TranslateModule, FormsModule, ReactiveFormsModule, SelectSearchComponent, ValidationErrorDirective, IonCheckbox],
})
export class ActionReplacePage implements OnInit {
    public replaceForm!: FormGroup;
    public suggestions: Selectable<IAction>[] = [];

    hasRelation: boolean = false;
    currentActionId: number;
    currentAction?: IAction;

    constructor(
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
        private actionService: ActionService,
        private activityActionService: ActivityActionService,
        private alertController: AlertController,
        private translate: TranslateService,
        private router: Router,
        private toastService: ToastService,
    ) {
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
                null,
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
        const newActionId = this.replaceForm.value.newAction.id;

        if (!this.replaceForm.value.newAction.id || !this.currentActionId) {
            return;
        }

        const confirmation = await this.askConfirmation();

        if (!confirmation) {
            return;
        }

        await this.activityActionService.replaceAction(
            this.currentActionId,
            newActionId,
        );

        if (this.replaceForm.value.deleteOldAction) {
            await this.actionService.delete(this.currentActionId);
        }

        this.toastService.enqueue({
            title: 'TK_ACTION_REPLACED_SUCCESSFULLY',
            type: 'success',
        });

        await this.router.navigate(
            ['/library'],
        );
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
        const actions = await this.actionService.getAllEnriched();

        this.suggestions = actions.map((item, index) => ({
            num: index,
            title: item.name,
            item,
        }));
    }

    getFormText() {
        return this.translate.instant(
            'TK_REPLACE_ALL_OCCURRENCES_OF_THE_ACTION_ACTIONNAME_WITH',
            { actionName: this.currentAction?.name }
        );
    }
}
