import { ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons } from '@ionic/angular/standalone';
import { TagForm, TagFormComponent } from 'src/app/components/tag-form/tag-form.component';
import { ITag } from 'src/app/db/models/tag';
import { ActivatedRoute, Router } from '@angular/router';
import { TagService } from 'src/app/services/tag.service';
import { TranslateModule } from '@ngx-translate/core';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-tag-edit',
  templateUrl: './tag-edit.page.html',
  styleUrls: ['./tag-edit.page.scss'],
  imports: [IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, BackButtonComponent, TagFormComponent],
})
export class TagEditPage {
  private route = inject(ActivatedRoute);
  private tagService = inject(TagService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  @ViewChild('updateFormRef') updateFormRef!: TagFormComponent;

  tagId: number;
  tag?: ITag;

  constructor() {
    this.tagId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ionViewDidEnter() {
    this.tag = await this.tagService.getById(this.tagId);
    this.cdr.detectChanges();
  }

  async updateTag(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    const tagFormValue = this.updateFormRef.tagForm.value as TagForm;
    await this.tagService.update(this.tagId, tagFormValue);

    this.toastService.enqueue({
      title: 'TK_TAG_UPDATED_SUCCESSFULLY',
      type: 'success',
    });

    // TODO: navigate to tag list
    await this.router.navigate(['/list']);
  }

  isFormValid() {
    return this.updateFormRef?.tagForm?.valid;
  }
}
