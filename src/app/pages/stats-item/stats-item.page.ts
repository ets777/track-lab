import { Component, inject } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StatsSkeletonComponent } from 'src/app/skeletons/stats/stats-skeleton.component';
import { StatsItemContentComponent } from 'src/app/components/stats-item-content/stats-item-content.component';
import { ListService } from 'src/app/services/list.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { IList } from 'src/app/db/models/list';
import { IActivity } from 'src/app/db/models/activity';
import { DatePeriod } from 'src/app/types/date-period';
import { CommonItem, Selectable } from 'src/app/types/selectable';
import { filterUniqueElements } from 'src/app/functions/item';
import { addDays, addMonths, format } from 'date-fns';

@Component({
  selector: 'app-stats-item',
  templateUrl: './stats-item.page.html',
  styleUrls: ['./stats-item.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, TranslateModule, StatsSkeletonComponent, StatsItemContentComponent],
})
export class StatsItemPage {
  private listService = inject(ListService);
  private activityService = inject(ActivityService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private translate = inject(TranslateService);

  isLoading = true;
  lists: IList[] = [];
  initialActivities: IActivity[] = [];
  initialSuggestions: Selectable<CommonItem>[] = [];
  initialPeriod: DatePeriod | null = null;
  savedPeriod: string | null = null;
  savedItem: string | null = null;

  ionViewWillEnter() {
    this.isLoading = true;
  }

  async ionViewDidEnter() {
    this.isLoading = true;
    await new Promise(resolve => setTimeout(resolve));

    this.lists = await this.listService.getAll();
    this.savedPeriod = localStorage.getItem('stats-item-date-period');
    this.savedItem = localStorage.getItem('stats-item-item');

    const period = this.computeInitialPeriod('stats-item', this.savedPeriod);
    if (period) {
      this.initialActivities = await this.activityService.getByDate(period.startDate, period.endDate);
      this.initialSuggestions = await this.buildSuggestions(this.lists);
      this.initialPeriod = period;
    } else {
      this.initialActivities = [];
      this.initialSuggestions = [];
      this.initialPeriod = null;
    }

    this.isLoading = false;
  }

  private computeInitialPeriod(storageKey: string, savedPeriodJson: string | null): DatePeriod | null {
    const periodTypeStr = localStorage.getItem(`${storageKey}-period-type`);

    if (periodTypeStr === 'null') {
      return savedPeriodJson ? JSON.parse(savedPeriodJson) : null;
    }

    const periodType = (periodTypeStr ?? 'week') as 'week' | '2weeks' | 'month';
    const savedPeriod = savedPeriodJson ? JSON.parse(savedPeriodJson) as DatePeriod : null;
    const endDate = savedPeriod?.endDate ?? format(new Date(), 'yyyy-MM-dd');

    let startDate: string;
    if (periodType === '2weeks') {
      startDate = format(addDays(new Date(endDate), -13), 'yyyy-MM-dd');
    } else if (periodType === 'month') {
      startDate = format(addMonths(new Date(endDate), -1), 'yyyy-MM-dd');
    } else {
      startDate = format(addDays(new Date(endDate), -6), 'yyyy-MM-dd');
    }

    return { startDate, endDate };
  }

  private async buildSuggestions(lists: IList[]): Promise<Selectable<CommonItem>[]> {
    const allDbActions = await this.actionService.getAllUnhidden();
    const actions: CommonItem[] = allDbActions.map(a => ({ name: a.name, type: 'action', itemId: a.id }));

    const allDbTags = await this.tagService.getAllUnhidden();
    const tags: CommonItem[] = allDbTags.map(t => ({ name: t.name, type: 'tag', itemId: t.id }));

    const allDbItems = await this.itemService.getAllUnhidden();
    const activityItems: CommonItem[] = allDbItems.map(i => ({ name: i.name, type: 'item', itemId: i.id }));

    const itemListId: Record<number, number> = {};
    allDbItems.forEach(i => { itemListId[i.id] = i.listId; });

    const allItems = filterUniqueElements([...actions, ...tags, ...activityItems]);

    return allItems.map((item, index) => {
      let subtitle: string;
      if (item.type === 'item') {
        const list = lists.find(l => l.id === itemListId[item.itemId]);
        subtitle = list ? this.translate.instant(list.name) : this.translate.instant('TK_ITEM');
      } else {
        subtitle = this.translate.instant('TK_' + item.type.toUpperCase());
      }
      return { num: index, title: item.name, subtitle, item };
    });
  }
}
