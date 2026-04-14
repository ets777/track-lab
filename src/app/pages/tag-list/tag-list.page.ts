import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonList, IonItem, IonIcon, IonButtons, IonButton, IonActionSheet, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { BackButtonComponent } from 'src/app/components/back-button/back-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TagService } from 'src/app/services/tag.service';
import { OverlayEventDetail } from '@ionic/core';
import { Router } from '@angular/router';
import { ITag } from 'src/app/db/models/tag';
import { AlertController } from '@ionic/angular';
import { ToastService } from 'src/app/services/toast.service';
import { DefaultSkeletonComponent } from 'src/app/skeletons/default/default-skeleton.component';

@Component({
  selector: 'app-tag-list',
  templateUrl: './tag-list.page.html',
  styleUrls: ['./tag-list.page.scss'],
  imports: [IonFabButton, IonFab, IonActionSheet, IonButton, IonButtons, IonIcon, IonItem, IonList, IonLabel, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, BackButtonComponent, DefaultSkeletonComponent],
})
export class TagListPage {
  private tagService = inject(TagService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);

  tags: ITag[] = [];
  isLoading = true;

  public tagActionSheetButtons = [
    { text: this.translate.instant('TK_VIEW'), data: { action: 'view' } },
    { text: this.translate.instant('TK_EDIT'), data: { action: 'edit' } },
    { text: this.translate.instant('TK_DELETE'), role: 'destructive', data: { action: 'delete' } },
  ];

  ionViewWillEnter() {
    this.isLoading = true;
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));
    await this.fetchTags();
    this.isLoading = false;
  }

  async fetchTags() {
    this.tags = (await this.tagService.getAll())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async doTagAction(event: CustomEvent<OverlayEventDetail>, tagId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/tag', tagId]);
        break;
      case 'delete':
        await this.deleteTag(tagId);
        break;
      case 'edit':
        await this.router.navigate(['/tag/edit', tagId]);
        break;
    }
  }

  async deleteTag(tagId: number) {
    if (await this.confirm()) {
      await this.tagService.deleteWithRelations(tagId);
      this.toastService.enqueue({ title: 'TK_TAG_DELETED_SUCCESSFULLY', type: 'success' });
      await this.fetchTags();
    }
  }

  async confirm() {
    const alert = await this.alertController.create({
      header: this.translate.instant('TK_ARE_YOU_SURE'),
      buttons: [
        { text: this.translate.instant('TK_YES'), role: 'yes' },
        { text: this.translate.instant('TK_NO'), role: 'no' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'yes';
  }

  async goToViewPage(tagId: number) {
    await this.router.navigate(['/tag', tagId]);
  }

  async goToAddPage() {
    await this.router.navigate(['/tag/add']);
  }
}
