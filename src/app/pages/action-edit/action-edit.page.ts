import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { ActionForm, ActionFormComponent } from 'src/app/components/action-form/action-form.component';
import { IAction } from 'src/app/db/models/action';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionService } from 'src/app/services/action.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
    selector: 'app-action-edit',
    templateUrl: './action-edit.page.html',
    styleUrls: ['./action-edit.page.scss'],
    imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, BackButtonComponent, TranslateModule, ActionFormComponent],
})
export class ActionEditPage {
    @ViewChild('updateFormRef') updateFormRef!: ActionFormComponent;

    actionId: number;
    action?: IAction;

    constructor(
        private route: ActivatedRoute,
        private actionService: ActionService,
        private toastService: ToastService,
        private cdr: ChangeDetectorRef,
        private router: Router,
    ) {
        this.actionId = Number(this.route.snapshot.paramMap.get('id'));
    }

    async ionViewDidEnter() {
        this.action = await this.actionService.getEnriched(this.actionId);
        this.cdr.detectChanges();
    }

    async updateAction(): Promise<void> {
        if (!this.isFormValid()) {
            return;
        }

        const actionFormValue = this.updateFormRef.actionForm.value as ActionForm;
        await this.actionService.updateWithTags(this.actionId, actionFormValue);

        this.toastService.enqueue({
            title: 'TK_ACTION_UPDATED_SUCCESSFULLY',
            type: 'success',
        });

        await this.router.navigate(['/library']);
    }

    isFormValid() {
        return this.updateFormRef?.actionForm?.valid;
    }
}
