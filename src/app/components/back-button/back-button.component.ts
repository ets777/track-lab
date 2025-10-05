import { Component, OnInit } from '@angular/core';
import { IonButton, IonIcon } from "@ionic/angular/standalone";
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-back-button',
  templateUrl: './back-button.component.html',
  styleUrls: ['./back-button.component.scss'],
  imports: [IonIcon, IonButton],
})
export class BackButtonComponent implements OnInit {

  constructor(
    private navController: NavController,
  ) { }

  ngOnInit() {}

  goToBackUrl() {
    this.navController.back();
  }
}
