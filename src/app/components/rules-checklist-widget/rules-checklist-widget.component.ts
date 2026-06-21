import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, IonSkeletonText } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationService } from 'src/app/services/navigation.service';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, checkmark, ellipseOutline } from 'ionicons/icons';

export interface ChecklistItem {
  name: string;
  met: boolean;
  progress: string | null;
}

const VISIBLE_COUNT = 3;

@Component({
  selector: 'app-rules-checklist-widget',
  templateUrl: './rules-checklist-widget.component.html',
  styleUrl: './rules-checklist-widget.component.scss',
  imports: [IonIcon, IonSkeletonText, TranslateModule],
})
export class RulesChecklistWidgetComponent {
  @Input() items: ChecklistItem[] = [];
  @Input() isLoading = true;
  @Input() skeletonCount = VISIBLE_COUNT;

  get skeletonItems(): number[] {
    return Array.from({ length: Math.min(this.skeletonCount, VISIBLE_COUNT) });
  }

  get showMoreSkeleton(): boolean {
    return this.skeletonCount > VISIBLE_COUNT;
  }

  private router = inject(Router);
  private navigationService = inject(NavigationService);

  constructor() {
    addIcons({ shieldCheckmarkOutline, checkmark, ellipseOutline });
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

  getProgressPct(item: ChecklistItem): number {
    if (!item.progress) return item.met ? 100 : 0;
    const [a, b] = item.progress.split('/').map(Number);
    if (!b) return 0;
    return Math.min(100, Math.round((a / b) * 100));
  }
}
