import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonSegmentButton, IonLabel, IonList, IonItem, IonSegment, IonSegmentView, IonSegmentContent, IonIcon, IonButtons, IonButton, IonActionSheet } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActionService } from 'src/app/services/action.service';
import { OverlayEventDetail } from '@ionic/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-library',
  templateUrl: './library.page.html',
  styleUrls: ['./library.page.scss'],
  standalone: true,
  imports: [IonActionSheet, IonButton, IonButtons, IonIcon, IonSegment, IonItem, IonList, IonLabel, IonSegmentButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, IonSegmentView, IonSegmentContent]
})
export class LibraryPage implements OnInit {
  tags: { id: number; name: string }[] = [{ id: 1, name: 'lalala' }];
  actions: { id: number; name: string }[] = [{ id: 1, name: 'ololo' }];

  public activityActionSheetButtons = [
    {
      text: this.translate.instant('TK_VIEW'),
      data: {
        action: 'view',
      },
    },
    {
      text: this.translate.instant('TK_EDIT'),
      data: {
        action: 'edit',
      },
    },
    {
      text: this.translate.instant('TK_DELETE'),
      role: 'destructive',
      data: {
        action: 'delete',
      },
    },
  ];

  constructor(
    private actionService: ActionService,
    private translate: TranslateService,
    private router: Router,
  ) { }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    this.actions = (await this.actionService.getAll())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async doActionAction(event: CustomEvent<OverlayEventDetail>, actionId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.goToViewActionPage(actionId);
        break;
      case 'delete':
        // await this.deleteActivity(actionId);
        break;
      case 'edit':
        // await this.goToEditPage(actionId);
        break;
      default:
        break;
    }
  }

  async goToViewActionPage(actionId: number) {
    await this.router.navigate(['/action', actionId]);
  }
}
