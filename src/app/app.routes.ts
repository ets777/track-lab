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
        path: 'view/:id',
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
        loadComponent: () => import('./pages/entity-view/entity-view.page').then(m => m.EntityViewPage),
        data: { entityType: 'action' },
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
        loadComponent: () => import('./pages/entity-view/entity-view.page').then(m => m.EntityViewPage),
        data: { entityType: 'tag' },
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
        loadComponent: () => import('./pages/stats-item/stats-item.page').then(m => m.StatsItemPage)
      },
      {
        path: 'rules',
        loadComponent: () => import('./pages/stats-rules/stats-rules.page').then(m => m.StatsRulesPage)
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
    path: 'rule',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/rule-list/rule-list.page').then(m => m.RuleListPage),
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/rule-add/rule-add.page').then(m => m.RuleAddPage),
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/rule-edit/rule-edit.page').then(m => m.RuleEditPage),
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/rule-view/rule-view.page').then(m => m.RuleViewPage),
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
    path: 'library',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/lists/lists.page').then(m => m.ListsPage)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/list-edit/list-edit.page').then(m => m.ListEditPage)
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/list-add/list-add.page').then(m => m.ListAddPage)
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/list-view/list-view.page').then(m => m.ListViewPage)
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
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
    path: 'actions',
    loadComponent: () => import('./pages/library/library.page').then(m => m.LibraryPage)
  },
  {
    path: 'tag-list',
    loadComponent: () => import('./pages/tag-list/tag-list.page').then(m => m.TagListPage)
  },
  {
    path: 'item-list',
    loadComponent: () => import('./pages/item-list/item-list.page').then(m => m.ItemListPage)
  },
  {
    path: 'item',
    children: [
      {
        path: 'add',
        loadComponent: () => import('./pages/item-add/item-add.page').then(m => m.ItemAddPage),
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/item-edit/item-edit.page').then(m => m.ItemEditPage),
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/entity-view/entity-view.page').then(m => m.EntityViewPage),
        data: { entityType: 'item' },
      },
    ],
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
