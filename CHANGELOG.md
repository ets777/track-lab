# Changelog

## [0.5.6] - 2026-04-19

### Fixed

- Displaying the original action in search for replacement
- Suggestions for lists in the activity form
- Group header in the activity form is not clickable anymore if empty
- Hidden metrics and lists are shown now in activity edit form if they have value
- Small design issues
- Minor bugs

### Improved

- Library is now displayed by default in the Lab section

## [0.5.5] - 2026-04-17

### Added

- Ability to link any metric or library to an activity
- Links to actions and lists from the activity view
- Context menu on all view pages
- Search for actions, tags, and lists
- Unified view page for actions, tags, and lists (displays a list of related activities and a graph)

### Fixed

- Bug related to action replacements
- Emotions list after migration from older versions
- Bug preventing users from changing letter case in names
- Metrics not resetting after adding a new activity
- Redirection after action replacement

## [0.5.4] - 2026-04-13

### Added

- More info on metric view page
- Dates selecting for metric graph on view page

### Fixed

- The same activities appearing on previous date
- Editing actions in activity form

## [0.5.3] - 2026-04-11

### Added

- Choosing a date on history page
- Loading indicators for stats and backup restoring

### Fixed

- Removing basic metrics and list after restoring a backup
- Several issues on stats pages
- Database errors

### Improved

- Restoring time for big backups

## [0.5.2] - 2026-04-09

### Fixed

- Database migration to SQLite error fixed

## [0.5.1] - 2026-04-08

### Added

- Page for viewing activity

### Fixed

- Bug with new metrics fixed
- Adding button position fixed
- Database errors fixed

## [0.5.0] - 2026-04-05

### Added

- Custom metrics for tracking numeric values
- Custom lists for tracking various things
- New achievements for metrics and lists
- Reset database button

### Improved

- Database migrated from IndexedDB to SQLite
- Minor design changes

### Removed

- Markdown export

## [0.4.2] - 2025-11-03

### Fixed

- Shorter toast display duration
- Markdown import error
- Suggestion display and behavior bugs
- Library view not refreshing after item deletion

## [0.4.1] - 2025-10-24

### Added

- Toast notifications for actions
- Exit the app by double-pressing the system back button

### Improved

- Homepage link now depends on the selected language
- Action input field now expands to multiple lines for long text
- Suggestions now depend on the cursor position in the input field
- Search now matches any part of a string, not only the beginning

### Fixed

- Pre-filling from the last activity (again)
- Hitbox of the "Update end time" button
- Missing translations in graph labels restored
- Graph width issues
- Overlap between the three-dots menu and activity title
- Toasts appearing simultaneously with achievements


## [0.4.0] - 2025-10-17

### Added

- Tags for actions and activities
- Library item lists (actions and tags)
- Statistics for actions and tags
- Auto backup

## [0.3.5] - 2025-10-05

### Added

- Validation for repeating elements for actions and emotions inputs

### Fixed

- Updating start time on adding form after updating last activity's end time
- Suggestions doesn't appear if were added to input
- Update end time button hitbox increased
- Default start time updating after user touched the input

## [0.3.4] - 2025-10-02

### Added

- Documentation page for activities

### Fixed

- Dates order on graph
- Default date and start time updating
- Refresh end time button behavior
- End time autorefresh

## [0.3.3] - 2025-10-01

### Added

- Refresh button for end time

### Fixed

- Activities order

## [0.3.2] - 2025-09-25

### Fixed

- Updating end time of previous activity
- Achievement "Rewriting history"
- Error on stats page when activities after midnight were added

## [0.3.1] - 2025-09-22

### Fixed

- Duplicated suggestions
- Date validation issue on stats page
- Suggestion design

## [0.3.0] - 2025-09-21

### Added

- Backups
- Achievements
- Suggestions for actions
- Checkbox "don't measure"
- Simple graph on stats page
- Some navigation changes

### Improved

- Average values calculation

## [0.2.2] - 2025-09-09

### Fixed

- Paths to assets
- Default title and favicon replaced for web version

## [0.2.1] - 2025-09-08

### Fixed

- Missed translations
- Ranges have the same length for any language
- Information messages while export and import

### Added

- App info and link to home page in settings
- Meta data in exported files (app version and date)

## [0.2.0] - 2025-09-05

### Added

- Editing and deleting activities
- Validation messages and masks for time and date inputs
- Changing weeks and months on the stats page
- Language switching (English and Russian)
- Importing and exporting activities in Markdown format
- Minor design changes

## [0.1.3] - 2025-08-30

### Fixed

- Refreshering data while changing tabs
- Pre-filling from last activity
- Version of APK matchs with actual version of the app

## [0.1.2] - 2025-08-29

### Fixed

- Name changed to TrackLab
- Default launcher icon was replaced

## [0.1.1] - 2025-08-27

### Fixed

- Overlapping by system UI
- Black status bar in light theme
- Test button has been hidden
- Pre-filling from last activity

### Added

- Some validations

## [0.1.0] - 2025-08-25

### Added

- Ability to add activities
- Activity history view
- Average values calculation for a selected period