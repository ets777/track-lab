import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { RuleForm, RuleFormComponent } from 'src/app/components/rule-form/rule-form.component';
import { RuleService } from 'src/app/services/rule.service';
import { ToastService } from 'src/app/services/toast.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-rule-add',
  templateUrl: './rule-add.page.html',
  styleUrls: ['./rule-add.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, RuleFormComponent, BackButtonComponent],
})
export class RuleAddPage {
  private ruleService = inject(RuleService);
  private toastService = inject(ToastService);

  @ViewChild('addFormRef') addFormRef!: RuleFormComponent;

  async addRule(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const ruleFormValue = this.addFormRef.ruleForm.value as RuleForm;

    await this.ruleService.addFromForm(ruleFormValue);
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_RULE_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.addFormRef?.ruleForm?.valid;
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
