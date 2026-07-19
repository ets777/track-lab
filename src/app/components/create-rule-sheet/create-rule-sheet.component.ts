import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, IonContent, IonIcon, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { RuleForm, RuleFormComponent } from '../rule-form/rule-form.component';
import { RuleService } from 'src/app/services/rule.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { HookService } from 'src/app/services/hook.service';

export type CreatedRule = {
  id: number;
  name: string;
};

/**
 * Bottom sheet that creates a rule without leaving the current form. Kept apart
 * from `app-create-entity-sheet` because `app-rule-form` embeds that sheet for
 * its own subject creation, and a shared sheet would make the imports cyclic.
 */
@Component({
  selector: 'app-create-rule-sheet',
  templateUrl: './create-rule-sheet.component.html',
  styleUrls: ['../create-entity-sheet/create-entity-sheet.component.scss'],
  imports: [IonModal, IonContent, IonIcon, IonFooter, CommonModule, TranslateModule, RuleFormComponent],
})
export class CreateRuleSheetComponent {
  private ruleService = inject(RuleService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private hookService = inject(HookService);

  @Input() isOpen = false;

  @Output() created = new EventEmitter<CreatedRule>();
  @Output() dismissed = new EventEmitter<void>();

  @ViewChild(RuleFormComponent) ruleFormRef?: RuleFormComponent;

  saving = false;

  constructor() {
    addIcons({ closeOutline });
  }

  async save() {
    if (this.saving) return;
    this.saving = true;

    try {
      const form = this.ruleFormRef;
      if (!form || !(await form.validate())) return;

      const value = form.ruleForm.value as RuleForm;
      const name = form.previewName;
      const id = await this.ruleService.addFromForm(value);
      this.hookService.emit({ type: 'rule.added', payload: { ruleId: id } });
      this.toastService.enqueue({ title: 'TK_RULE_ADDED_SUCCESSFULLY', type: 'success' });
      this.created.emit({ id, name });
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('CreateRuleSheetComponent.save', e);
    } finally {
      this.saving = false;
    }
  }
}
