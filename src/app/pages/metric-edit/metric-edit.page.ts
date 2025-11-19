import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-metric-edit',
  templateUrl: './metric-edit.page.html',
  styleUrls: ['./metric-edit.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class MetricEditPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
