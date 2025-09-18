import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  constructor(
    private router: Router,
    private navController: NavController,
  ) {}

  goToBackUrl() {
    const url = this.router.url;
    const urlParts = url.split('/').filter((part) => part);

    let routes = this.router.config;
    let skipSegments = 0;

    for (const urlPart of urlParts) {
      const route = routes.find((route) => route.path == urlPart);

      if (route?.children) {
        routes = route.children;
      } else {
        skipSegments++;
      }
    }

    if (urlParts.length === 1) {
      this.navController.navigateRoot('/activity');
    } else {
      this.navController.navigateBack(
        urlParts
          .slice(0, urlParts.length - Math.max(skipSegments, 1))
          .join('/')
      );
    }
  }
}
