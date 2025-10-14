import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonSegmentButton, IonLabel, IonList, IonItem, IonSegment, IonSegmentView, IonSegmentContent, IonIcon, IonButtons, IonButton, IonActionSheet, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActionService } from 'src/app/services/action.service';
import { OverlayEventDetail } from '@ionic/core';
import { Router } from '@angular/router';
import { TagService } from 'src/app/services/tag.service';
import { ITag } from 'src/app/db/models/tag';
import { IAction } from 'src/app/db/models/action';
import { TagsComponent } from "src/app/components/tags/tags.component";

@Component({
  selector: 'app-library',
  templateUrl: './library.page.html',
  styleUrls: ['./library.page.scss'],
  standalone: true,
  imports: [IonFabButton, IonFab, IonActionSheet, IonButton, IonButtons, IonIcon, IonSegment, IonItem, IonList, IonLabel, IonSegmentButton, IonContent, IonHeader, IonToolbar, CommonModule, FormsModule, TranslateModule, IonSegmentView, IonSegmentContent, TagsComponent]
})
export class LibraryPage implements OnInit {
  @ViewChild(IonSegment) segment!: IonSegment;
  
  tags: ITag[] = [];
  actions: IAction[] = [];

  public actionSheetButtons = [
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
      text: this.translate.instant('TK_REPLACE'),
      data: {
        action: 'replace',
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
    private tagService: TagService,
    private translate: TranslateService,
    private router: Router,
  ) { }

  ngOnInit() {
  }

  async ionViewDidEnter() {
    this.actions = (await this.actionService.getAllEnriched())
      .sort((a, b) => a.name.localeCompare(b.name));
    this.tags = (await this.tagService.getAll())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async doActionAction(event: CustomEvent<OverlayEventDetail>, actionId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/action', actionId]);
        break;
      case 'delete':
        // await this.deleteActivity(actionId);
        break;
      case 'replace':
        await this.router.navigate(['/action/replace', actionId]);
        break;
      case 'edit':
        await this.router.navigate(['/action/edit', actionId]);
        break;
      default:
        break;
    }
  }

  async doTagAction(event: CustomEvent<OverlayEventDetail>, tagId: number) {
    const action = event.detail.data?.action;

    switch (action) {
      case 'view':
        await this.router.navigate(['/tag', tagId]);
        break;
      case 'delete':
        // await this.deleteActivity(actionId);
        break;
      case 'edit':
        await this.router.navigate(['/tag/edit', tagId]);
        break;
      default:
        break;
    }
  }

  async goToAddPage() {
    const selectedSegment = this.segment.value;

    if (selectedSegment == 'actions') {
      await this.router.navigate(['/action/add']);
    }
    
    if (selectedSegment == 'tags') {
      await this.router.navigate(['/tag/add']);
    }
  }
}
