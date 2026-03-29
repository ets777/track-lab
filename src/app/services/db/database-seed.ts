import { format, subDays } from 'date-fns';
import { SQLiteService } from './sqlite.service';

export async function seedDatabase(sqlite: SQLiteService) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');

  // id: 1=Mood, 2=Energy, 3=Weight, 4=Heart rate
  await sqlite.execute(`
    INSERT OR REPLACE INTO metrics (id, name, isBase, isHidden, step, unit, minValue, maxValue, showPreviousValue) VALUES
      (1, 'TK_MOOD',     1, 0, 1,   NULL,  1,   10,  1),
      (2, 'TK_ENERGY',   1, 0, 1,   NULL,  1,   10,  1),
      (3, 'Weight',      0, 0, 0.1, 'kg',  30,  200, 0),
      (4, 'Heart rate',  0, 0, 1,   'bpm', 40,  220, 0);
  `);

  // id: 1=TK_EMOTIONS, 2=Places
  await sqlite.execute(`
    INSERT OR REPLACE INTO dictionaries (id, name) VALUES
      (1, 'TK_EMOTIONS'),
      (2, 'Places');
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

  // activityId: 1=today run, 2=today meditation, 3=yesterday gym, 4=yesterday read, 5=twoDaysAgo cycle
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime, comment) VALUES
      (1, ?, '07:00', '07:45', 'Morning run'),
      (2, ?, '20:00', '20:30', 'Evening meditation'),
      (3, ?, '06:45', '07:30', 'Gym session'),
      (4, ?, '21:00', '21:45', 'Reading before sleep'),
      (5, ?, '08:00', '09:00', 'Long cycling route');`,
    [today, today, yesterday, yesterday, twoDaysAgo],
  );

  await sqlite.execute(`
    INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES
      (1, 1),
      (2, 2),
      (3, 4),
      (4, 3),
      (5, 5);
  `);

  await sqlite.execute(`
    INSERT OR REPLACE INTO activityTags (activityId, tagId) VALUES
      (1, 1), (1, 2),
      (2, 4), (2, 5),
      (3, 1), (3, 2),
      (4, 3),
      (5, 2);
  `);

  await sqlite.execute(`
    INSERT OR REPLACE INTO activityTerms (activityId, termId) VALUES
      (1, 3),
      (2, 1),
      (3, 3),
      (4, 1),
      (5, 4);
  `);

  // metricId: 1=Mood, 2=Energy
  await sqlite.execute(`
    INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES
      (1, 1, 8), (1, 2, 9),
      (2, 1, 7), (2, 2, 6),
      (3, 1, 6), (3, 2, 8),
      (4, 1, 7), (4, 2, 5),
      (5, 1, 9), (5, 2, 9);
  `);
}
