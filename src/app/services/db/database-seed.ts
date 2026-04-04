import { format, subDays } from 'date-fns';
import { SQLiteService } from './sqlite.service';

export async function seedDatabase(sqlite: SQLiteService) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const d4 = format(subDays(new Date(), 4), 'yyyy-MM-dd');
  const d5 = format(subDays(new Date(), 5), 'yyyy-MM-dd');
  const d7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const d10 = format(subDays(new Date(), 10), 'yyyy-MM-dd');
  const d11 = format(subDays(new Date(), 11), 'yyyy-MM-dd');
  const d14 = format(subDays(new Date(), 14), 'yyyy-MM-dd');
  const d17 = format(subDays(new Date(), 17), 'yyyy-MM-dd');
  const d18 = format(subDays(new Date(), 18), 'yyyy-MM-dd');
  const d21 = format(subDays(new Date(), 21), 'yyyy-MM-dd');
  const d24 = format(subDays(new Date(), 24), 'yyyy-MM-dd');
  const d25 = format(subDays(new Date(), 25), 'yyyy-MM-dd');
  const d28 = format(subDays(new Date(), 28), 'yyyy-MM-dd');

  // id: 1=Mood, 2=Energy, 3=Weight, 4=Heart rate
  await sqlite.execute(`
    INSERT OR REPLACE INTO metrics (id, name, isBase, isHidden, step, unit, minValue, maxValue, showPreviousValue) VALUES
      (1, 'TK_MOOD',     1, 0, 1,   NULL,  1,   10,  1),
      (2, 'TK_ENERGY',   1, 0, 1,   NULL,  1,   10,  1),
      (3, 'Weight',      0, 0, 0.1, 'kg',  70,  90,  1),
      (4, 'Heart rate',  0, 0, 1,   'bpm', 40,  220, 0);
  `);

  // id: 1=TK_EMOTIONS, 2=Places
  await sqlite.execute(`
    INSERT OR REPLACE INTO dictionaries (id, name, isBase) VALUES
      (1, 'TK_EMOTIONS', 1),
      (2, 'Places',      0);
  `);

  // id: 1-5=emotions, 6-8=places
  await sqlite.execute(`
    INSERT OR REPLACE INTO terms (id, dictionaryId, name) VALUES
      (1, 1, 'Happy'),
      (2, 1, 'Sad'),
      (3, 1, 'Focused'),
      (4, 1, 'Tired'),
      (5, 1, 'Anxious'),
      (6, 2, 'Home'),
      (7, 2, 'Office'),
      (8, 2, 'Gym');
  `);

  // id: 1=Running, 2=Meditation, 3=Reading, 4=Gym workout, 5=Cycling, 6=Weighed myself
  await sqlite.execute(`
    INSERT OR REPLACE INTO actions (id, name, isHidden) VALUES
      (1, 'Running',        0),
      (2, 'Meditation',     0),
      (3, 'Reading',        0),
      (4, 'Gym workout',    0),
      (5, 'Cycling',        0),
      (6, 'Weighed myself', 0);
  `);

  // id: 1=Health, 2=Sport, 3=Productivity, 4=Personal, 5=Mindfulness
  await sqlite.execute(`
    INSERT OR REPLACE INTO tags (id, name, isHidden) VALUES
      (1, 'Health',       0),
      (2, 'Sport',        0),
      (3, 'Productivity', 0),
      (4, 'Personal',     0),
      (5, 'Mindfulness',  0);
  `);

  await sqlite.execute(`
    INSERT OR REPLACE INTO actionTags (actionId, tagId) VALUES
      (1, 1), (1, 2),
      (2, 4), (2, 5),
      (3, 3),
      (4, 1), (4, 2),
      (5, 2);
  `);

  // action 6 (Weighed myself) → metric 3 (Weight)
  await sqlite.execute(`
    INSERT OR REPLACE INTO actionMetrics (actionId, metricId) VALUES
      (6, 3);
  `);

  // tag 2 (Sport) → metric 4 (Heart rate)
  await sqlite.execute(`
    INSERT OR REPLACE INTO tagMetrics (tagId, metricId) VALUES
      (2, 4);
  `);

  // action 2 (Meditation) → dictionary 2 (Places)
  await sqlite.execute(`
    INSERT OR REPLACE INTO actionDictionaries (actionId, dictionaryId) VALUES
      (2, 2);
  `);

  // Activities:
  //   1  = today run
  //   2  = today meditation
  //   3  = yesterday gym
  //   4  = yesterday reading
  //   5  = 2d ago cycling
  //   6  = 4d ago run
  //   7  = 5d ago gym
  //   8  = 7d ago weigh-in
  //   9  = 10d ago cycling
  //   10 = 11d ago run
  //   11 = 14d ago weigh-in
  //   12 = 17d ago gym
  //   13 = 18d ago run
  //   14 = 21d ago weigh-in
  //   15 = 24d ago cycling
  //   16 = 25d ago run
  //   17 = 28d ago weigh-in
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime, comment) VALUES
      (1,  ?, '07:00', '07:45', 'Morning run'),
      (2,  ?, '20:00', '20:30', 'Evening meditation'),
      (3,  ?, '06:45', '07:30', 'Gym session'),
      (4,  ?, '21:00', '21:45', 'Reading before sleep'),
      (5,  ?, '08:00', '09:00', 'Long cycling route'),
      (6,  ?, '07:10', '07:55', 'Morning run'),
      (7,  ?, '06:50', '07:40', 'Gym session'),
      (8,  ?, '08:30', '08:35', 'Weekly weigh-in'),
      (9,  ?, '08:15', '09:20', 'Cycling route'),
      (10, ?, '07:00', '07:50', 'Morning run'),
      (11, ?, '08:30', '08:35', 'Weekly weigh-in'),
      (12, ?, '07:00', '07:45', 'Gym session'),
      (13, ?, '07:15', '08:00', 'Morning run'),
      (14, ?, '08:30', '08:35', 'Weekly weigh-in'),
      (15, ?, '08:00', '09:05', 'Cycling route'),
      (16, ?, '07:05', '07:50', 'Morning run'),
      (17, ?, '08:30', '08:35', 'Weekly weigh-in');`,
    [today, today, yesterday, yesterday, twoDaysAgo, d4, d5, d7, d10, d11, d14, d17, d18, d21, d24, d25, d28],
  );

  await sqlite.execute(`
    INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES
      (1,  1),
      (2,  2),
      (3,  4),
      (4,  3),
      (5,  5),
      (6,  1),
      (7,  4),
      (8,  6),
      (9,  5),
      (10, 1),
      (11, 6),
      (12, 4),
      (13, 1),
      (14, 6),
      (15, 5),
      (16, 1),
      (17, 6);
  `);

  await sqlite.execute(`
    INSERT OR REPLACE INTO activityTags (activityId, tagId) VALUES
      (1,  1), (1,  2),
      (2,  4), (2,  5),
      (3,  1), (3,  2),
      (4,  3),
      (5,  2),
      (6,  1), (6,  2),
      (7,  1), (7,  2),
      (9,  2),
      (10, 1), (10, 2),
      (12, 1), (12, 2),
      (13, 1), (13, 2),
      (15, 2),
      (16, 1), (16, 2);
  `);

  await sqlite.execute(`
    INSERT OR REPLACE INTO activityTerms (activityId, termId) VALUES
      (1,  3),
      (2,  1),
      (3,  3),
      (4,  1),
      (5,  4),
      (6,  3),
      (7,  3),
      (9,  4),
      (10, 3),
      (12, 3),
      (13, 1),
      (15, 4),
      (16, 3);
  `);

  // metricId: 1=Mood, 2=Energy, 3=Weight, 4=Heart rate
  await sqlite.execute(`
    INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES
      (1,  1, 8),  (1,  2, 9),  (1,  4, 158),
      (2,  1, 7),  (2,  2, 6),
      (3,  1, 6),  (3,  2, 8),  (3,  4, 162),
      (4,  1, 7),  (4,  2, 5),
      (5,  1, 9),  (5,  2, 9),  (5,  4, 145),
      (6,  1, 7),  (6,  2, 8),  (6,  4, 161),
      (7,  1, 6),  (7,  2, 7),  (7,  4, 168),
      (8,  1, 7),  (8,  2, 6),  (8,  3, 77.4),
      (9,  1, 8),  (9,  2, 8),  (9,  4, 143),
      (10, 1, 7),  (10, 2, 7),  (10, 4, 155),
      (11, 1, 6),  (11, 2, 7),  (11, 3, 77.8),
      (12, 1, 7),  (12, 2, 8),  (12, 4, 165),
      (13, 1, 8),  (13, 2, 8),  (13, 4, 159),
      (14, 1, 7),  (14, 2, 6),  (14, 3, 78.1),
      (15, 1, 7),  (15, 2, 7),  (15, 4, 141),
      (16, 1, 6),  (16, 2, 7),  (16, 4, 157),
      (17, 1, 7),  (17, 2, 7),  (17, 3, 78.5);
  `);
}
