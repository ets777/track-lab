import { format, subDays } from 'date-fns';
import { SQLiteService } from './sqlite.service';

export async function seedDatabase(sqlite: SQLiteService) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');

  await sqlite.execute(`
    INSERT INTO metrics (name, isBase, isHidden, step, minValue, maxValue, showPreviousValue) VALUES
      ('TK_MOOD',   1, 0, 1,   1,  10, 1),
      ('TK_ENERGY', 1, 0, 1,   1,  10, 1),
      ('Weight',    0, 0, 0.1, 30, 200, 0);
  `);

  await sqlite.execute(`
    INSERT INTO dictionaries (name) VALUES
      ('TK_EMOTIONS'),
      ('Places');
  `);

  await sqlite.execute(`
    INSERT INTO terms (dictionaryId, name) VALUES
      (1, 'Happy'),
      (1, 'Sad'),
      (1, 'Focused'),
      (1, 'Tired'),
      (1, 'Anxious'),
      (2, 'Home'),
      (2, 'Office'),
      (2, 'Gym');
  `);

  await sqlite.execute(`
    INSERT INTO actions (name, isHidden) VALUES
      ('Running',      0),
      ('Meditation',   0),
      ('Reading',      0),
      ('Gym workout',  0),
      ('Cycling',      0);
  `);

  await sqlite.execute(`
    INSERT INTO tags (name, isHidden) VALUES
      ('Health',       0),
      ('Sport',        0),
      ('Productivity', 0),
      ('Personal',     0),
      ('Mindfulness',  0);
  `);

  // actionId: 1=Running, 2=Meditation, 3=Reading, 4=Gym, 5=Cycling
  // tagId:    1=Health,  2=Sport,      3=Productivity, 4=Personal, 5=Mindfulness
  await sqlite.execute(`
    INSERT INTO actionTags (actionId, tagId) VALUES
      (1, 1), (1, 2),
      (2, 4), (2, 5),
      (3, 3),
      (4, 1), (4, 2),
      (5, 2);
  `);

  // metricId: 1=Mood, 2=Energy, 3=Weight
  await sqlite.execute(`
    INSERT INTO actionDictionaries (actionId, dictionaryId) VALUES
      (2, 2);
  `);

  // Activities: today × 2, yesterday × 2, twoDaysAgo × 1
  await sqlite.run(
    `INSERT INTO activities (date, startTime, endTime, comment) VALUES
      (?, '07:00', '07:45', 'Morning run'),
      (?, '20:00', '20:30', 'Evening meditation'),
      (?, '06:45', '07:30', 'Gym session'),
      (?, '21:00', '21:45', 'Reading before sleep'),
      (?, '08:00', '09:00', 'Long cycling route');`,
    [today, today, yesterday, yesterday, twoDaysAgo],
  );

  // activityId: 1=today run, 2=today meditation, 3=yesterday gym, 4=yesterday read, 5=twoDaysAgo cycle
  await sqlite.execute(`
    INSERT INTO activityActions (activityId, actionId) VALUES
      (1, 1),
      (2, 2),
      (3, 4),
      (4, 3),
      (5, 5);
  `);

  await sqlite.execute(`
    INSERT INTO activityTags (activityId, tagId) VALUES
      (1, 1), (1, 2),
      (2, 4), (2, 5),
      (3, 1), (3, 2),
      (4, 3),
      (5, 2);
  `);

  await sqlite.execute(`
    INSERT INTO activityTerms (activityId, termId) VALUES
      (1, 3),
      (2, 1),
      (3, 3),
      (4, 1),
      (5, 4);
  `);

  // metricId: 1=Mood, 2=Energy
  await sqlite.execute(`
    INSERT INTO activityMetrics (activityId, metricId, value) VALUES
      (1, 1, 8), (1, 2, 9),
      (2, 1, 7), (2, 2, 6),
      (3, 1, 6), (3, 2, 8),
      (4, 1, 7), (4, 2, 5),
      (5, 1, 9), (5, 2, 9);
  `);
}
