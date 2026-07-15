import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { TagForm, TagFormComponent } from 'src/app/components/tag-form/tag-form.component';
import { TagService } from 'src/app/services/tag.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';

@Component({
  selector: 'app-tag-add',
  templateUrl: './tag-add.page.html',
  styleUrls: ['./tag-add.page.scss'],
  imports: [IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, TagFormComponent, NavButtonComponent],
})
export class TagAddPage {
  private tagService = inject(TagService);
  private toastService = inject(ToastService);

  @ViewChild('addFormRef') addFormRef!: TagFormComponent;

  async addTag(): Promise<void> {
    if (!(await this.addFormRef.validate())) {
      return;
    }

    const tagFormValue = this.addFormRef.tagForm.value as TagForm;

    await this.tagService.add({ name: tagFormValue.name });
    this.resetForm();

    this.toastService.enqueue({
      title: 'TK_TAG_ADDED_SUCCESSFULLY',
      type: 'success',
    });
  }

  resetForm() {
    this.addFormRef?.setDefaultData();
  }
}
