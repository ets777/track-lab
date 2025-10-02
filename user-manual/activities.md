# Activities

Activity is a main tracking unit with date, start time, end time, actions and metrics.

## History

### Time

Activity covers a fixed block of time from start time to end time. All specified actions are considered perfomed during the block.

That means, if you "worked, listened to music" from 12:00 to 15:00, you worked for three hours and listened to music for three hours.

Activity can have empty end time. In that case, it considered as unfinished and won't be taken into account in statistics.

### Day length

One day lasts from 00:00 to 23:59. If activity crosses midnight (for example, starts at 23:50 and ends at 00:10), it considered as last activity of the day.

## Adding an activity

To add an activity press "add" button on the bottom panel. You'll see a form with these fields (* - required):

1. *Actions
2. *Date
3. *Start time
4. End time
5. Metrics (Mood, Energy and Satiety)
6. Emotions
7. Comment

### Actions

Actions must be separated by commas. While typing you will see suggestions formed from your previous entries. If there is no suggestions new action will be added to your library so you will see it in the list of suggestions next time.

### Date

Date will be filled automatically depending on the last added activity.

If the last activity was yesterday and its start time is earlier than its end time, yesterday date will be set. In any other cases it will be today's date.

- **Last activity**: 2025-10-01; 23:30 - 23:45;
- **New date value**: 2025-10-01;

- **Last activity**: 2025-10-01; 23:45 - 00:15; (start time is later than its end time)
- **New date value**: 2025-10-02 (date was set to new date, because 23 > 00)

It helps to keep date actual when day changes after midnight.

### Start time

Start time will be filled automatically with value equal to the end time of the last added activity.

- **Last activity**: 08:00 - 08:15
- **New start time value**: 08:15;

If there is no last sctivity or it was more than one day ago, current time will be set.
