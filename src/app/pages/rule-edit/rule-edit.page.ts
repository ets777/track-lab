import { ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RuleForm, RuleFormComponent } from 'src/app/components/rule-form/rule-form.component';
import { RuleService } from 'src/app/services/rule.service';
import { IRule } from 'src/app/db/models/rule';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-rule-edit',
  templateUrl: './rule-edit.page.html',
  styleUrls: ['./rule-edit.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, BackButtonComponent, RuleFormComponent],
})
export class RuleEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ruleService = inject(RuleService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('editFormRef') editFormRef!: RuleFormComponent;

  ruleId: number;
  rule?: IRule;

  constructor() {
    this.ruleId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.rule = await this.ruleService.getById(this.ruleId);
    this.cdr.detectChanges();
  }

  isFormValid() {
    return this.editFormRef?.ruleForm?.valid;
  }

  async saveRule() {
    if (!this.isFormValid()) return;

    const form = this.editFormRef.ruleForm.value as RuleForm;
    await this.ruleService.updateFromForm(this.ruleId, form);

    this.toastService.enqueue({ title: 'TK_RULE_UPDATED_SUCCESSFULLY', type: 'success' });
    await this.router.navigate(['/rule']);
  }
}
