import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IStreak } from 'src/app/db/models/streak';
import { StreakService } from 'src/app/services/streak.service';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { Selectable, CommonItem } from 'src/app/types/selectable';
import { TagService } from 'src/app/services/tag.service';
import { ActionService } from 'src/app/services/action.service';
import { ItemService } from 'src/app/services/item.service';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { ListService } from 'src/app/services/list.service';
import { filterUniqueElements } from 'src/app/functions/item';
import { IList } from 'src/app/db/models/list';
import { IItem } from 'src/app/db/models/item';
import { capitalize } from 'src/app/functions/string';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';
import { dateFormatValidator } from 'src/app/validators/date-format.validator';
import { DatePickerComponent } from 'src/app/form-elements/date-picker/date-picker.component';

export type StreakForm = {
  term: CommonItem;
  startDate: string;
};

@Component({
  selector: 'app-streak-form',
  templateUrl: './streak-form.component.html',
  styleUrls: ['./streak-form.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, TranslateModule, SelectSearchComponent, ValidationErrorDirective, DatePickerComponent],
})
export class StreakFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private streakService = inject(StreakService);
  private tagService = inject(TagService);
  private translate = inject(TranslateService);
  private listService = inject(ListService);
  private actionService = inject(ActionService);
  private itemService = inject(ItemService);
  private lists: IList[] = [];
  public suggestions: Selectable<CommonItem>[] = [];

  @Input() streak?: IStreak;

  public streakForm!: ModelFormGroup<StreakForm>;

  async ngOnInit() {
    const today = new Date().toISOString().slice(0, 10);
    this.streakForm = this.formBuilder.group({
      startDate: [today, [Validators.required, dateFormatValidator]],
      term: [null as CommonItem | null, Validators.required],
    });

    await this.loadSuggestions();

    if (this.streak) {
      this.populateFromStreak();
    }
  }

  private populateFromStreak() {
    const streak = this.streak!;
    let term = null;

    if (streak.actionId) {
      term = this.suggestions.find(s => s.item.type === 'action' && s.item.itemId === streak.actionId)?.item ?? null;
    } else if (streak.tagId) {
      term = this.suggestions.find(s => s.item.type === 'tag' && s.item.itemId === streak.tagId)?.item ?? null;
    } else if (streak.itemId) {
      term = this.suggestions.find(s => !['action', 'tag'].includes(s.item.type) && s.item.itemId === streak.itemId)?.item ?? null;
    }

    this.streakForm.patchValue({ startDate: streak.startDate, term });
  }

  async loadSuggestions() {
    this.lists = await this.listService.getAll();

    const actions = (await this.actionService.getAllUnhidden())
      .map((action) => ({
        name: action.name,
        type: 'action',
        itemId: action.id,
      } as CommonItem));
    const tags = (await this.tagService.getAllUnhidden())
      .map((tag) => ({
        name: tag.name,
        type: 'tag',
        itemId: tag.id,
      } as CommonItem));
    const items = (await this.itemService.getAllUnhidden())
      .map((item) => ({
        name: item.name,
        type: this.getItemType(item),
        itemId: item.id,
      } as CommonItem));

    const allItems = filterUniqueElements([
      ...actions,
      ...tags,
      ...items,
    ]);

    this.suggestions = allItems.map((item, index) => ({
      num: index,
      title: item.name,
      subtitle: this.translate.instant('TK_' + item.type.toUpperCase()),
      item,
    }));
  }

  getItemType(item: IItem) {
    const itemList = this.lists.find(
      (list) => list.id == item.listId,
    );

    return itemList?.name ?? '';
  }

  getSuggestionSubtitle(item: CommonItem) {
    if (['action', 'tag'].includes(item.type)) {
      return this.translate.instant('TK_' + item.type.toUpperCase())
    }

    return capitalize(item.type);
  }

  setDefaultData() {
    this.streakForm.patchValue({
      startDate: new Date().toISOString().slice(0, 10),
      term: null,
    });
  }
}
