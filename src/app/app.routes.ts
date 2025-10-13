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
        path: 'edit/:id',
        loadComponent: () => import('./pages/action-edit/action-edit.page').then(m => m.ActionEditPage)
      },
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
        path: 'edit/:id',
        loadComponent: () => import('./pages/tag-edit/tag-edit.page').then(m => m.TagEditPage)
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/tag-add/tag-add.page').then(m => m.TagAddPage)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/tag-view/tag-view.page').then(m => m.TagViewPage)
      },
    ],
  },
  {
    path: 'stats',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/stats/stats.page').then((m) => m.StatsPage),
      },
      {
        path: 'achievements',
        loadComponent: () => import('./pages/achievements/achievements.page').then(m => m.AchievementsPage)
      },
      {
        path: 'library-item',
        loadComponent: () => import('./pages/library-item-stats/library-item-stats.page').then(m => m.LibraryItemStatsPage)
      },
    ],
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
