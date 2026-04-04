import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonItem, IonInput, IonLabel, IonCheckbox } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { ListRef } from 'src/app/types/selectable';

export type ItemForm = {
  name: string;
  isHidden: boolean;
  list: ListRef;
};

@Component({
  selector: 'app-item-form',
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss'],
  imports: [IonItem, IonLabel, IonInput, IonCheckbox, SelectSearchComponent, FormsModule, ReactiveFormsModule, TranslateModule],
})
export class ItemFormComponent {

  constructor() { }

}
