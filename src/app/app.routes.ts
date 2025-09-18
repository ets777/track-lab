import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'activity-add',
    loadComponent: () =>
      import('./pages/activity-add/activity-add.page').then((m) => m.ActivityAddPage),
  },
  {
    path: 'activity',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/activity-list/activity-list.page').then((m) => m.ActivityListPage),
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/activity-edit/activity-edit.page').then(m => m.ActivityEditPage)
      },
    ]
  },
  {
    path: 'activity-calendar',
    loadComponent: () =>
      import('./pages/activity-calendar/activity-calendar.page').then((m) => m.ActivityCalendarPage),
  },
  {
    path: 'database',
    loadComponent: () => import('./pages/database/database.page').then( m => m.DatabasePage)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then( m => m.SettingsPage)
  },
  {
    path: '',
    redirectTo: '/activity',
    pathMatch: 'full',
  },
];
