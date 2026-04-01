import { Routes } from '@angular/router';

export const routes: Routes = [
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
      {
        path: 'view',
        loadComponent: () => import('./pages/activity-view/activity-view.page').then(m => m.ActivityViewPage)
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/activity-add/activity-add.page').then((m) => m.ActivityAddPage),
      },
    ]
  },
  {
    path: 'action',
    children: [
      {
        path: 'replace/:id',
        loadComponent: () => import('./pages/action-replace/action-replace.page').then(m => m.ActionReplacePage)
      },
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
        path: 'library',
        loadComponent: () => import('./pages/stats-term/stats-term.page').then(m => m.StatsTermPage)
      },
    ],
  },
  {
    path: 'metric',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/metric-list/metric-list.page').then(m => m.MetricListPage)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/metric-edit/metric-edit.page').then(m => m.MetricEditPage)
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/metric-add/metric-add.page').then(m => m.MetricAddPage)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/metric-view/metric-view.page').then(m => m.MetricViewPage)
      },
    ],
  },
  {
    path: 'streak',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/streak-list/streak-list.page').then(m => m.StreakListPage)
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/streak-add/streak-add.page').then(m => m.StreakAddPage)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/streak-edit/streak-edit.page').then(m => m.StreakEditPage)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/streak-view/streak-view.page').then(m => m.StreakViewPage)
      },
    ],
  },
  {
    path: 'dictionary',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dictionary-list/dictionary-list.page').then(m => m.DictionaryListPage)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/dictionary-edit/dictionary-edit.page').then(m => m.DictionaryEditPage)
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/dictionary-add/dictionary-add.page').then(m => m.DictionaryAddPage)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/dictionary-view/dictionary-view.page').then(m => m.DictionaryViewPage)
      },
    ],
  },
  {
    path: 'database',
    loadComponent: () => import('./pages/database/database.page').then(m => m.DatabasePage)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage)
  },
  {
    path: 'library',
    loadComponent: () => import('./pages/library/library.page').then(m => m.LibraryPage)
  },
  {
    path: 'tag-list',
    loadComponent: () => import('./pages/tag-list/tag-list.page').then(m => m.TagListPage)
  },
  {
    path: 'term-list',
    loadComponent: () => import('./pages/term-list/term-list.page').then(m => m.TermListPage)
  },
  {
    path: 'term/add',
    loadComponent: () => import('./pages/term-add/term-add.page').then(m => m.TermAddPage)
  },
  {
    path: 'term/edit/:id',
    loadComponent: () => import('./pages/term-edit/term-edit.page').then(m => m.TermEditPage)
  },
  {
    path: '',
    redirectTo: '/activity',
    pathMatch: 'full',
  },
  {
    path: 'dictionary-add',
    loadComponent: () => import('./pages/dictionary-add/dictionary-add.page').then( m => m.DictionaryAddPage)
  },
  {
    path: 'dictionary-edit',
    loadComponent: () => import('./pages/dictionary-edit/dictionary-edit.page').then( m => m.DictionaryEditPage)
  },
];
