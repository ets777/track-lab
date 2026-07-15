import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActionForm, ActionFormComponent } from 'src/app/components/action-form/action-form.component';
import { ActionService } from 'src/app/services/action.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';

@Component({
  selector: 'app-action-add',
  templateUrl: './action-add.page.html',
  styleUrls: ['./action-add.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, ActionFormComponent, NavButtonComponent],
})
export class ActionAddPage {
  private actionService = inject(ActionService);
  private toastService = inject(ToastService);

  @ViewChild('addFormRef') addFormRef!: ActionFormComponent;

  async addAction(): Promise<void> {
    if (!(await this.addFormRef.validate())) {
      return;
    }

    const actionFormValue = this.addFormRef.actionForm.value as ActionForm;

    await this.actionService.addFromForm(actionFormValue);
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTION_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
