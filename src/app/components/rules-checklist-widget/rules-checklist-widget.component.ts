import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonSkeletonText } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationService } from 'src/app/services/navigation.service';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, checkmarkCircle, ellipseOutline } from 'ionicons/icons';

export interface ChecklistItem {
  name: string;
  met: boolean;
  progress: string | null;
}

const VISIBLE_COUNT = 4;

@Component({
  selector: 'app-rules-checklist-widget',
  templateUrl: './rules-checklist-widget.component.html',
  styleUrl: './rules-checklist-widget.component.scss',
  imports: [IonCard, IonCardContent, IonIcon, IonSkeletonText, TranslateModule],
})
export class RulesChecklistWidgetComponent {
  @Input() items: ChecklistItem[] = [];
  @Input() isLoading = true;

  private router = inject(Router);
  private navigationService = inject(NavigationService);

  constructor() {
    addIcons({ shieldCheckmarkOutline, checkmarkCircle, ellipseOutline });
  }

  get visibleItems(): ChecklistItem[] {
    return this.items.slice(0, VISIBLE_COUNT);
  }

  get hiddenCount(): number {
    return Math.max(0, this.items.length - VISIBLE_COUNT);
  }

  get totalCount(): number {
    return this.items.length;
  }

  get doneCount(): number {
    return this.items.filter(i => i.met).length;
  }

  navigate() {
    this.navigationService.setFromDashboard();
    this.router.navigate(['/stats/rules']);
  }

  navigateToAddRule(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/rule/add']);
  }
}
