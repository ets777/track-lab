import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActionForm, ActionFormComponent } from 'src/app/components/action-form/action-form.component';
import { ActionService } from 'src/app/services/action.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-action-add',
  templateUrl: './action-add.page.html',
  styleUrls: ['./action-add.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, ActionFormComponent, ReactiveFormsModule],
})
export class ActionAddPage implements OnInit {
  @ViewChild('addFormRef') addFormRef!: ActionFormComponent;
  
  constructor(
    private actionService: ActionService,
    private toastService: ToastService,
  ) { }

  ngOnInit() {
  }

  async addAction(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const activityFormValue = this.addFormRef.actionForm.value as ActionForm;

    await this.actionService.addFromForm(activityFormValue);
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_ACTION_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.addFormRef?.actionForm?.valid;
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
