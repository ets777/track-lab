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
    path: 'action',
    children: [
      {
        path: 'add',
        loadComponent: () => import('./pages/action-add/action-add.page').then(m => m.ActionAddPage)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/action-view/action-view.page').then(m => m.ActionViewPage),
      },
    ],
  },
  {
    path: 'tag',
    children: [
      {
        path: ':id',
        loadComponent: () => import('./pages/tag-view/tag-view.page').then(m => m.TagViewPage)
      },
    ],
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
    path: 'library',
    loadComponent: () => import('./pages/library/library.page').then( m => m.LibraryPage)
  },
  {
    path: '',
    redirectTo: '/activity',
    pathMatch: 'full',
  },
];
