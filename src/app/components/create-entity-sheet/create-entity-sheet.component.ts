import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonModal, IonContent, IonIcon, IonSelect, IonSelectOption, IonFooter } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { MetricForm, MetricFormComponent } from '../metric-form/metric-form.component';
import { ActionForm, ActionFormComponent } from '../action-form/action-form.component';
import { TagForm, TagFormComponent } from '../tag-form/tag-form.component';
import { ItemForm, ItemFormComponent } from '../item-form/item-form.component';
import { ListForm, ListFormComponent } from '../list-form/list-form.component';
import { MetricService } from 'src/app/services/metric.service';
import { ActionService } from 'src/app/services/action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ListService } from 'src/app/services/list.service';
import { ListLinkService } from 'src/app/services/list-link.service';
import { ToastService } from 'src/app/services/toast.service';
import { LogService } from 'src/app/services/log.service';
import { HookService } from 'src/app/services/hook.service';
import { IList } from 'src/app/db/models/list';

/** Rules are created by `app-create-rule-sheet` — keeping them out avoids a cycle with `app-rule-form`. */
export type CreateEntityType = 'metric' | 'action' | 'tag' | 'item' | 'list';

export type CreatedEntity = {
  type: CreateEntityType;
  id: number;
  name: string;
};

const TITLE_KEYS: Record<CreateEntityType, string> = {
  metric: 'TK_NEW_METRIC',
  action: 'TK_NEW_ACTION',
  tag: 'TK_NEW_TAG',
  item: 'TK_NEW_ITEM',
  list: 'TK_NEW_LIST',
};

/**
 * Bottom sheet that creates one entity without leaving the current form.
 * Hosts the same form components the dedicated add pages use, saves through
 * the matching service and emits the created entity so the caller can select
 * it right away. The caller owns closing (set `isOpen` to false).
 */
@Component({
  selector: 'app-create-entity-sheet',
  templateUrl: './create-entity-sheet.component.html',
  styleUrls: ['./create-entity-sheet.component.scss'],
  imports: [
    IonModal, IonContent, IonIcon, IonSelect, IonSelectOption, IonFooter,
    CommonModule, FormsModule, TranslateModule,
    MetricFormComponent, ActionFormComponent, TagFormComponent, ItemFormComponent, ListFormComponent,
  ],
})
export class CreateEntitySheetComponent {
  private metricService = inject(MetricService);
  private actionService = inject(ActionService);
  private tagService = inject(TagService);
  private itemService = inject(ItemService);
  private listService = inject(ListService);
  private listLinkService = inject(ListLinkService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private hookService = inject(HookService);

  @Input() isOpen = false;
  @Input() type: CreateEntityType = 'metric';

  @Output() created = new EventEmitter<CreatedEntity>();
  @Output() dismissed = new EventEmitter<void>();

  @ViewChild(MetricFormComponent) metricFormRef?: MetricFormComponent;
  @ViewChild(ActionFormComponent) actionFormRef?: ActionFormComponent;
  @ViewChild(TagFormComponent) tagFormRef?: TagFormComponent;
  @ViewChild(ItemFormComponent) itemFormRef?: ItemFormComponent;
  @ViewChild(ListFormComponent) listFormRef?: ListFormComponent;

  lists: IList[] = [];
  listId: number | null = null;
  saving = false;

  constructor() {
    addIcons({ closeOutline });
  }

  get titleKey(): string {
    return TITLE_KEYS[this.type];
  }

  /** Items live inside a list, so the list must be picked before the form can validate names. */
  async onWillPresent() {
    this.listId = null;
    if (this.type === 'item') {
      try {
        this.lists = await this.listService.getAll();
      } catch (e) {
        this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
        this.logService.error('CreateEntitySheetComponent.onWillPresent', e);
      }
    }
  }

  async save() {
    if (this.saving) return;
    this.saving = true;

    try {
      const createdEntity = await this.createEntity();
      if (createdEntity) {
        this.created.emit(createdEntity);
      }
    } catch (e) {
      this.toastService.enqueue({ title: 'TK_AN_ERROR_OCCURRED', type: 'error' });
      this.logService.error('CreateEntitySheetComponent.save', e);
    } finally {
      this.saving = false;
    }
  }

  private async createEntity(): Promise<CreatedEntity | null> {
    switch (this.type) {
      case 'metric': return this.createMetric();
      case 'action': return this.createAction();
      case 'tag': return this.createTag();
      case 'item': return this.createItem();
      case 'list': return this.createList();
    }
  }

  private async createMetric(): Promise<CreatedEntity | null> {
    const form = this.metricFormRef;
    if (!form || !(await form.validate())) return null;

    const value = form.metricForm.value as MetricForm;
    const id = await this.metricService.addFromForm(value, form.getResolvedLinks());
    this.toastService.enqueue({ title: 'TK_METRIC_ADDED_SUCCESSFULLY', type: 'success' });

    return { type: 'metric', id, name: value.name };
  }

  private async createAction(): Promise<CreatedEntity | null> {
    const form = this.actionFormRef;
    if (!form || !(await form.validate())) return null;

    const value = form.actionForm.value as ActionForm;
    const id = await this.actionService.addFromForm(value);
    if (!id) return null;
    this.toastService.enqueue({ title: 'TK_ACTION_ADDED_SUCCESSFULLY', type: 'success' });

    return { type: 'action', id, name: value.name };
  }

  private async createTag(): Promise<CreatedEntity | null> {
    const form = this.tagFormRef;
    if (!form || !(await form.validate())) return null;

    const value = form.tagForm.value as TagForm;
    const id = await this.tagService.add({ name: value.name });
    if (!id) return null;
    this.toastService.enqueue({ title: 'TK_TAG_ADDED_SUCCESSFULLY', type: 'success' });

    return { type: 'tag', id, name: value.name };
  }

  private async createItem(): Promise<CreatedEntity | null> {
    const form = this.itemFormRef;
    if (!form || this.listId === null || !(await form.validate())) return null;

    const value = form.itemForm.value as ItemForm;
    const id = await this.itemService.add({ name: value.name, listId: this.listId });
    if (!id) return null;
    this.hookService.emit({ type: 'item.added', payload: {} });
    this.toastService.enqueue({ title: 'TK_ITEM_ADDED_SUCCESSFULLY', type: 'success' });

    return { type: 'item', id, name: value.name };
  }

  private async createList(): Promise<CreatedEntity | null> {
    const form = this.listFormRef;
    if (!form || !(await form.validate())) return null;

    const value = form.listForm.value as ListForm;
    const id = await this.listService.add({ name: value.name, isHidden: value.isHidden ?? false });

    const links = form.getResolvedLinks();
    if (links.length) {
      await this.listLinkService.bulkAdd(
        links.map(link => ({ listId: id, subjectType: link.type, subjectId: link.itemId })),
      );
    }

    this.hookService.emit({ type: 'list.added', payload: {} });
    this.toastService.enqueue({ title: 'TK_ACTION_ADDED_SUCCESSFULLY', type: 'success' });

    return { type: 'list', id, name: value.name };
  }
}
