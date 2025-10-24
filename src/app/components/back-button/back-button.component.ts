import { Component, OnInit } from '@angular/core';
import { IonButton, IonIcon } from "@ionic/angular/standalone";
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-back-button',
  templateUrl: './back-button.component.html',
  styleUrls: ['./back-button.component.scss'],
  imports: [IonIcon, IonButton],
})
export class BackButtonComponent implements OnInit {

  constructor(
    private navigationService: NavigationService,
  ) { }

  ngOnInit() {}

  goToBackUrl() {
    this.navigationService.goBack();
  }
}
