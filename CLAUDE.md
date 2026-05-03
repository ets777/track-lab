# TrackLab

An Android-first activity tracking app built with Ionic + Angular (standalone components) and Capacitor.

## Tech Stack

- **Framework**: Ionic + Angular (standalone components)
- **Native**: Capacitor (Android primary target)
- **Database**: SQLite (via `@capacitor-community/sqlite`); Dexie (IndexedDB) is deprecated (will be removed completely in v1.0.0)
- **Language**: TypeScript

## Project Structure

All application code lives under `src/app/`. Follow this structure strictly — every piece of code belongs in a specific folder by its role:

### `components/`

Reusable UI components shared across pages. Each component has its own subfolder (`.html`, `.scss`, `.ts`). Put a component here if it is used in more than one place or represents a standalone UI element.

Examples: `loading/`, `toast/`, `tooltip/`, `tabs/`, `back-button/`

### `form-elements/`

Custom Angular form controls (implement `ControlValueAccessor`). These are reusable inputs that integrate with Angular's reactive forms. Each element has its own subfolder.

Examples: `date-period-input/`, `select-search/`, `tag-input/`, `list-input/`

**Before creating a new form element, check if an existing one can be reused or extended. `app-select-search` is the single unified component for all suggestion/autocomplete needs — use it everywhere, no exceptions.**

- `app-select-search` — unified suggestion input. Single mode (default): strict selection from a predefined `Selectable[]` list, validates that text matches a suggestion. Multiple mode (`[multiple]="true"`): comma-separated free-text with autocomplete hints; already-entered items are excluded from suggestions automatically. For non-standard inputs (e.g. textarea), project the element as content and mark it with `#selectSearchAnchor` — the host listens for focus/blur events automatically.
- `app-tag-input` — wraps `app-select-search` with `[multiple]="true"`, loads suggestions from `TagService`. Use for the activity tags field.
- `app-list-input` — wraps `app-select-search` with `[multiple]="true"`, loads suggestions from `ItemService` by `listId`. Supports a removable button projected via `select-search-end` attribute. Use for custom list fields on the activity form.

### `functions/`

Pure, reusable utility functions — no side effects, no Angular DI. One file per domain.

Examples: `date.ts`, `string.ts`, `activity.ts`, `item.ts`, `crypto.ts`

### `types/`

Shared TypeScript type and interface definitions. No logic — types only. One file per concept.

Examples: `date-period.ts`, `selectable.ts`, `model-form-group.ts`, `with-optional-keys.ts`

### `validators/`

Synchronous Angular `ValidatorFn` functions for reactive forms.

Examples: `date-format.validator.ts`, `tags.validator.ts`, `time-format.validator.ts`

### `validators-async/`

Asynchronous Angular `AsyncValidatorFn` functions (e.g. DB lookups).

Examples: `existing-entity.validator.ts`, `reserved-metric-name.validator.ts`

### `directives/`

Angular attribute directives applied to existing elements.

### `services/`

Angular injectable services (DI). Business logic, data access, and cross-component state. Keep services focused on a single domain entity or concern.

### `services/db/`

Database layer: adapters, migrations, and the router that selects SQLite vs Dexie at runtime.

### `db/`

Raw database schema: models, data seed, and query helpers independent of Angular DI.

### `pages/`

Route-level page components. Each page has its own subfolder. Pages orchestrate services and components — keep heavy logic out of page components.

**Pages must open immediately.** Never block navigation with async work. The pattern in `ionViewDidEnter` is:

1. Set loading state (`isLoading = true`)
2. `await new Promise(resolve => setTimeout(resolve))` — yields to the renderer so the skeleton paints before any heavy work starts
3. Fetch data
4. Set `isLoading = false`

### `skeletons/`

Loading placeholder components shown by pages while data is being fetched. Each skeleton mirrors the layout of its target page/component using `ion-skeleton-text`. The `default/` subfolder contains a generic list skeleton used by most pages. Before creating a page-specific skeleton, consider extending `DefaultSkeletonComponent` with additional inputs (e.g. `count`, `lines`, `showIcon`) to cover the case. Only create a new skeleton component when the layout is distinct enough that parametrizing the default would make it overly complex.

Examples: `default/`

## Domain Entities

- **Actions** — a system list of activity templates (e.g. "Running", "Reading"). Used to log activities.
- **Tags** — a system list of labels attached to actions for filtering/grouping.
- **Lists** (a.k.a. custom lists or user lists) — user-created lists of items (e.g. Emotions, Food, Books, Places). Each list contains **items**.
- **Items** — entries inside a list (e.g. "Happy" in Emotions, "Pizza" in Food).

When the user writes "actions, tags, and lists" they mean all lists — both system (actions, tags) and custom (any user-created list). Custom lists vary per user so they are referred to collectively as "lists".

## Metric Data Timing

Metric values recorded on an activity are considered actual at the **end time** of that activity. Users log activities after they happen, so metric values reflect the state at the moment the activity ended — not when it started. Graphs and interpolations must use `endTime` as the reference point for metric data, not `startTime`.

## Code Rules

- **Android first**: all features must work on Android via Capacitor/SQLite. Browser support is secondary (dev only).
- **Standalone components**: use Angular standalone APIs throughout — no NgModules.
- **Folder discipline**: before creating a file, pick the right folder from the list above. Do not place utilities in pages, do not place types in services, etc.
- **One concern per file**: services handle one entity/domain, validators handle one rule, functions files group one domain.
- **Prefer small components**: if component is too big (more than 300 lines of HTML) it should be broken into smaller components, even if they won't be reusable
- **Stick to the DRY principle**: don't repeat yourself. Create reusable components and actively use it, write reusable functions into functions folder and use it.
- **Database backups and migrations**: it's important to support backup feature throughout entire development process. Any changes in database should be reflected in backup feature, taking into account compability (old backups should be 100% compatible with a new version). Also migrations should be supported when there is any change in database.
- **Pages**: All pages are located in pages folder and should have only one root component inside `ion-content` and its skeleton. All logic should be incapsulated into that component. Pages handle loading process - showing a skeleton while loading. By default a page should use default skeleton. If a special skeleton is required it should be created into skeleton folder and used on the page.
- **Reserved name prefix**: Entity names (actions, tags, metrics, and any future entities) must never start with `TK_`. `TK_` is reserved for translation keys. All entity name form controls must include `reservedPrefixValidator` from `src/app/validators/reserved-prefix.validator.ts` in their `validators` array.
- **Error handling**: Errors must never be swallowed silently. Whenever an async operation can fail, catch the error, show the user a `TK_AN_ERROR_OCCURRED` error toast via `ToastService`, and log the full error to `Documents/TrackLab/logs/` via `LogService` (native only). Use a `try/catch` with the context string `'ClassName.methodName'` passed to `logService.error()`.
- **Filter loading**: Any page that has filters (e.g. a date period selector) must show a loading modal via `LoadingService` while the filtered data is being fetched. Wrap the fetch in `try/catch/finally` — call `loadingService.show('TK_LOADING')` before the fetch, `loadingService.hide()` in `finally`, and handle errors per the error handling rule above.
- **Clickable list items**: Every item in a list must be tappable (`button` attribute on `ion-item`, with a `(click)` handler). Tapping navigates to the view page if one exists, otherwise to the edit page. Action buttons inside the item (e.g. three-dot menu) must call `$event.stopPropagation()` so they don't trigger the item's navigation.
- **View page context menu**: Every entity view page must have a three-dot menu button (`ellipsis-vertical` icon) in `slot="end"` of the toolbar. Tapping opens an `ActionSheetController` with Edit and Delete (destructive) options. Delete must confirm via `AlertController` with `TK_ARE_YOU_SURE`, show a success toast on completion, then navigate back to the list page.
- **No shadows**: Box shadows are strictly forbidden. Never use `box-shadow`, `--box-shadow`, `filter: drop-shadow()`, or `text-shadow` anywhere.
- **Back button**: Any page reachable via dashboard navigation tiles must show `<app-back-button>` in `slot="start"` of the toolbar when `navigationService.previousUrl === '/dashboard'`, replacing the menu button for that render.
- **Ionicons registration (MANDATORY)**: Every icon used by name in a template (`name="foo-outline"`) MUST be imported from `ionicons/icons` and registered via `addIcons({ fooOutline })` in the component constructor. Skipping this makes the icon invisible — no error is thrown. Never use an icon name in a template without a matching `addIcons` call in the same component. Example: `import { searchOutline } from 'ionicons/icons'; addIcons({ searchOutline });`
