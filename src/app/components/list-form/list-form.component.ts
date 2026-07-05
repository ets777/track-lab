import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonInput, IonCheckbox, IonBadge, IonIcon } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IList } from 'src/app/db/models/list';
import { IListLinkDb } from 'src/app/db/models/list-link';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { ToastService } from 'src/app/services/toast.service';
import { TooltipService } from 'src/app/services/tooltip.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ListService } from 'src/app/services/list.service';
import { CommonItem, Selectable } from 'src/app/types/selectable';
import { filterUniqueElements } from 'src/app/functions/item';
import { ListInputComponent, ListInputSuggestion } from 'src/app/form-elements/list-input/list-input.component';
import { reservedPrefixValidator } from 'src/app/validators/reserved-prefix.validator';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';

export type ListForm = {
  name: string;
  isHidden: boolean;
  links: string;
};

@Component({
  selector: 'app-list-form',
  templateUrl: './list-form.component.html',
  styleUrls: ['./list-form.component.scss'],
  imports: [IonCheckbox, IonInput, IonBadge, IonIcon, TranslateModule, FormsModule, ReactiveFormsModule, ListInputComponent],
})
export class ListFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private tooltip = inject(TooltipService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private listService = inject(ListService);

  public listForm!: ModelFormGroup<ListForm>;
  public suggestions: Selectable<CommonItem>[] = [];
  public linkSuggestions: ListInputSuggestion[] = [];
  public submitted = false;

  @Input() list?: IList;
  @Output() validityChange = new EventEmitter<boolean>();

  constructor() { }

  async ngOnInit() {
    this.listForm = this.formBuilder.group({
      name: ['', {
        validators: [Validators.required, reservedPrefixValidator],
        asyncValidators: [existingEntityValidator(this.listService, this.list?.name)],
      }],
      isHidden: [false],
      links: [''],
    });

    await this.loadSuggestions();

    if (this.list) {
      this.setListData(this.list);
    } else {
      this.setDefaultData();
    }

    this.listForm.statusChanges.subscribe(status => {
      this.validityChange.emit(status === 'VALID');
    });
    this.validityChange.emit(this.listForm.valid);
  }

  async loadSuggestions() {
    const actions = (await this.actionService.getAllUnhidden())
      .map((action) => ({ name: action.name, type: 'action', itemId: action.id } as CommonItem));
    const tags = (await this.tagService.getAllUnhidden())
      .map((tag) => ({ name: tag.name, type: 'tag', itemId: tag.id } as CommonItem));

    const allItems = filterUniqueElements([...actions, ...tags]);

    this.suggestions = allItems.map((item, index) => ({
      num: index,
      title: item.name,
      subtitle: this.translate.instant('TK_' + item.type.toUpperCase()),
      item,
    }));
    this.linkSuggestions = this.suggestions.map((s) => ({
      name: s.title,
      subtitle: s.subtitle,
    }));
  }

  get nameControl() {
    return this.listForm.get('name');
  }

  /** Show validation sign only after submit was attempted. */
  get showNameError(): boolean {
    return this.submitted && !!this.nameControl?.invalid;
  }

  get nameErrors(): string[] {
    const errors = this.nameControl?.errors;
    if (!errors) {
      return [];
    }

    const messages: string[] = [];
    if (errors['required']) {
      messages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
    }
    for (const key of Object.keys(errors)) {
      if (errors[key]?.message) {
        messages.push(this.translate.instant(errors[key].message));
      }
    }

    return messages;
  }

  /** Validate-on-submit: mark submitted, resolve pending async checks, return validity. */
  async validate(): Promise<boolean> {
    this.submitted = true;
    this.listForm.markAllAsTouched();
    this.nameControl?.updateValueAndValidity();

    if (this.listForm.pending) {
      await new Promise<void>((resolve) => {
        const sub = this.listForm.statusChanges.subscribe((status) => {
          if (status !== 'PENDING') {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    }

    return this.listForm.valid;
  }

  showItemsTip(event: Event) {
    event.preventDefault();
    this.tooltip.show(event, this.translate.instant('TK_LIST_ITEMS_TIP'));
  }

  /** Prefill the multiple picker from stored links (edit mode). */
  async setLinks(links: IListLinkDb[]) {
    if (!this.suggestions.length) {
      await this.loadSuggestions();
    }
    const names = links
      .map((link) => this.suggestions.find(
        (s) => s.item.type === link.subjectType && s.item.itemId === link.subjectId,
      )?.title)
      .filter((name): name is string => !!name);
    this.listForm.patchValue({ links: names.join(', ') });
  }

  /** Resolve the entered comma-separated names back to their linked subjects. */
  getResolvedLinks(): CommonItem[] {
    return (this.listForm.get('links')?.value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => this.suggestions.find(
        (s) => s.title.toLowerCase() === name.toLowerCase(),
      )?.item)
      .filter((item): item is CommonItem => !!item);
  }

  setDefaultData() {
    this.submitted = false;
    this.listForm.patchValue({
      name: '',
      isHidden: false,
      links: '',
    });
    this.listForm.markAsUntouched();
  }

  setListData(list: IList) {
    this.listForm.patchValue({
      name: list.name,
      isHidden: list.isHidden ?? false,
    });
  }

  onNameClick() {
    if (!this.list?.isBase) return;

    this.toastService.enqueue({
      title: 'TK_LIST_NAME_CANNOT_BE_CHANGED',
      type: 'error',
    });
  }
}
