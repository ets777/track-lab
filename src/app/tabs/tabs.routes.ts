import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'activity-add',
        loadComponent: () =>
          import('../pages/activity-add/activity-add.page').then((m) => m.ActivityAddPage),
      },
      {
        path: 'activity-list',
        loadComponent: () =>
          import('../pages/activity-list/activity-list.page').then((m) => m.ActivityListPage),
      },
      {
        path: 'activity-calendar',
        loadComponent: () =>
          import('../pages/activity-calendar/activity-calendar.page').then((m) => m.ActivityCalendarPage),
      },
      {
        path: '',
        redirectTo: '/tabs/activity-calendar',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/activity-calendar',
    pathMatch: 'full',
  },
];
