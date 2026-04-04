import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonItem, IonInput, IonLabel, IonCheckbox } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { SelectSearchComponent } from 'src/app/form-elements/select-search/select-search.component';
import { Dictionary } from 'src/app/types/selectable';

export type TermForm = {
  name: string;
  isHidden: boolean;
  dictionary: Dictionary;
};

@Component({
  selector: 'app-term-form',
  templateUrl: './term-form.component.html',
  styleUrls: ['./term-form.component.scss'],
  imports: [IonItem, IonLabel, IonInput, IonCheckbox, SelectSearchComponent, FormsModule, ReactiveFormsModule, TranslateModule],
})
export class TermFormComponent {

  constructor() { }

}
