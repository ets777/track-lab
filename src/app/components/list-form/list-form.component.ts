import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonItem, IonLabel, IonInput, IonCheckbox, IonBadge } from "@ionic/angular/standalone";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IList } from 'src/app/db/models/list';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { ToastService } from 'src/app/services/toast.service';
import { ActionService } from 'src/app/services/action.service';
import { CommonItem, Selectable } from 'src/app/types/selectable';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { ValidationErrorDirective } from 'src/app/directives/validation-error';

export type ListForm = {
  name: string;
  isHidden: boolean;
  item: CommonItem | null;
};

@Component({
  selector: 'app-list-form',
  templateUrl: './list-form.component.html',
  styleUrls: ['./list-form.component.scss'],
  imports: [IonCheckbox, IonInput, IonBadge, TranslateModule, IonLabel, IonItem, FormsModule, ReactiveFormsModule, SelectSearchComponent, ValidationErrorDirective],
})
export class ListFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private actionService = inject(ActionService);

  public listForm!: ModelFormGroup<ListForm>;
  public suggestions: Selectable<CommonItem>[] = [];

  @Input() list?: IList;
  @Output() validityChange = new EventEmitter<boolean>();

  constructor() { }

  async ngOnInit() {
    this.listForm = this.formBuilder.group({
      name: ['', Validators.required],
      isHidden: [false],
      item: [null as CommonItem | null],
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
    const actions = await this.actionService.getAllUnhidden();
    this.suggestions = actions.map((action, index) => ({
      num: index,
      title: action.name,
      subtitle: this.translate.instant('TK_ACTION'),
      item: { name: action.name, type: 'action', itemId: action.id } as CommonItem,
    }));
  }

  async setItemByActionId(actionId: number) {
    if (!this.suggestions.length) {
      await this.loadSuggestions();
    }
    const item = this.suggestions.find(s => s.item.type === 'action' && s.item.itemId === actionId)?.item ?? null;
    this.listForm.patchValue({ item });
  }

  setDefaultData() {
    this.listForm.patchValue({
      name: '',
      isHidden: false,
      item: null,
    });
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
