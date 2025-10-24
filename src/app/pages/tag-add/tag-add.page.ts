import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { TagForm, TagFormComponent } from 'src/app/components/tag-form/tag-form.component';
import { TagService } from 'src/app/services/tag.service';
import { ToastService } from 'src/app/services/toast.service';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';

@Component({
  selector: 'app-tag-add',
  templateUrl: './tag-add.page.html',
  styleUrls: ['./tag-add.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, TagFormComponent, ReactiveFormsModule, BackButtonComponent],
})
export class TagAddPage implements OnInit {
  @ViewChild('addFormRef') addFormRef!: TagFormComponent;

  constructor(
    private tagService: TagService,
    private toastService: ToastService,
  ) { }

  ngOnInit() {
  }

  async addTag(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const activityFormValue = this.addFormRef.tagForm.value as TagForm;

    await this.tagService.add({ name: activityFormValue.name });
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_TAG_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  isFormValid() {
    return this.addFormRef?.tagForm?.valid;
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
