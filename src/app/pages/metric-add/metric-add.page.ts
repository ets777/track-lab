import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MetricFormComponent } from 'src/app/components/metric-form/metric-form.component';

@Component({
  selector: 'app-metric-add',
  templateUrl: './metric-add.page.html',
  styleUrls: ['./metric-add.page.scss'],
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, MetricFormComponent],
})
export class MetricAddPage {

  constructor() { }

  isFormValid() {
    return true;
  }

  addMetric() {
    
  }
}
