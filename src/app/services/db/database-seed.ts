import { format, subDays } from 'date-fns';
import { SQLiteService } from './sqlite.service';

function d(n: number) { return format(subDays(new Date(), n), 'yyyy-MM-dd'); }

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

  // id: 1=Mood, 2=Energy, 3=Weight, 4=Heart rate, 5=Satiety
  await sqlite.execute(`
    INSERT OR REPLACE INTO metrics (id, name, isBase, isHidden, step, unit, minValue, maxValue, showPreviousValue) VALUES
      (1, 'TK_MOOD',     1, 0, 1,   NULL,  1,   10,  1),
      (2, 'TK_ENERGY',   1, 0, 1,   NULL,  1,   10,  1),
      (3, 'Weight',      0, 0, 0.1, 'kg',  70,  90,  1),
      (4, 'Heart rate',  0, 0, 1,   'bpm', 40,  220, 0),
      (5, 'TK_SATIETY',  1, 0, 1,   NULL,  1,   10,  1);
  `);

  // id: 1=TK_EMOTIONS, 2=Places
  await sqlite.execute(`
    INSERT OR REPLACE INTO lists (id, name, isBase) VALUES
      (1, 'TK_EMOTIONS', 1),
      (2, 'Places',      0);
  `);

  // id: 1-5=emotions, 6-8=places
  await sqlite.execute(`
    INSERT OR REPLACE INTO items (id, listId, name) VALUES
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
  // id: 7=Daily Walk, 8=Evening Stretch, 9=Cold Shower, 10=Coffee, 11=Pull-ups, 12=Dessert, 13=Yoga, 14=Journaling
  await sqlite.execute(`
    INSERT OR REPLACE INTO actions (id, name, isHidden) VALUES
      (1,  'Running',        0),
      (2,  'Meditation',     0),
      (3,  'Reading',        0),
      (4,  'Gym workout',    0),
      (5,  'Cycling',        0),
      (6,  'Weighed myself', 0),
      (7,  'Daily Walk',     0),
      (8,  'Evening Stretch',0),
      (9,  'Cold Shower',    0),
      (10, 'Coffee',         0),
      (11, 'Pull-ups',       0),
      (12, 'Dessert',        0),
      (13, 'Yoga',           0),
      (14, 'Journaling',     0);
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

  // action 2 (Meditation) → list 2 (Places)
  await sqlite.execute(`
    INSERT OR REPLACE INTO actionLists (actionId, listId) VALUES
      (2, 2);
  `);

  // ── Original activities 1–17 ──────────────────────────────────────────────
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
    INSERT OR REPLACE INTO activityItems (activityId, itemId) VALUES
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

  // metricId: 1=Mood, 2=Energy, 3=Weight, 4=Heart rate, 5=Satiety
  await sqlite.execute(`
    INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES
      (1,  1, 8),  (1,  2, 9),  (1,  4, 158), (1,  5, 7),
      (2,  1, 7),  (2,  2, 6),                 (2,  5, 6),
      (3,  1, 6),  (3,  2, 8),  (3,  4, 162), (3,  5, 8),
      (4,  1, 7),  (4,  2, 5),                 (4,  5, 5),
      (5,  1, 9),  (5,  2, 9),  (5,  4, 145), (5,  5, 9),
      (6,  1, 7),  (6,  2, 8),  (6,  4, 161), (6,  5, 7),
      (7,  1, 6),  (7,  2, 7),  (7,  4, 168), (7,  5, 6),
      (8,  1, 7),  (8,  2, 6),  (8,  3, 77.4),(8,  5, 7),
      (9,  1, 8),  (9,  2, 8),  (9,  4, 143), (9,  5, 8),
      (10, 1, 7),  (10, 2, 7),  (10, 4, 155), (10, 5, 6),
      (11, 1, 6),  (11, 2, 7),  (11, 3, 77.8),(11, 5, 7),
      (12, 1, 7),  (12, 2, 8),  (12, 4, 165), (12, 5, 7),
      (13, 1, 8),  (13, 2, 8),  (13, 4, 159), (13, 5, 8),
      (14, 1, 7),  (14, 2, 6),  (14, 3, 78.1),(14, 5, 6),
      (15, 1, 7),  (15, 2, 7),  (15, 4, 141), (15, 5, 7),
      (16, 1, 6),  (16, 2, 7),  (16, 4, 157), (16, 5, 5),
      (17, 1, 7),  (17, 2, 7),  (17, 3, 78.5),(17, 5, 7);
  `);

  // ── Rule demo activities 18–143 ───────────────────────────────────────────

  // Rule 1: Daily Walk >= 1/day — 35 consecutive days d0..d34, today done → blue
  const r1Dates = Array.from({ length: 35 }, (_, i) => d(i));
  await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES ${r1Dates.map((dt, i) => `(${18 + i}, '${dt}', '06:30', '07:00')`).join(', ')};`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${r1Dates.map((_, i) => `(${18 + i}, 7)`).join(', ')};`);

  // Rule 2: Evening Stretch >= 1/day — 25 days d1..d25, NOT today → yellow
  const r2Dates = Array.from({ length: 25 }, (_, i) => d(i + 1));
  await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES ${r2Dates.map((dt, i) => `(${53 + i}, '${dt}', '21:00', '21:20')`).join(', ')};`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${r2Dates.map((_, i) => `(${53 + i}, 8)`).join(', ')};`);

  // Rule 3: Cold Shower <= 1/day — 30 days d0..d29, today done → blue
  const r3Dates = Array.from({ length: 30 }, (_, i) => d(i));
  await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES ${r3Dates.map((dt, i) => `(${78 + i}, '${dt}', '06:00', '06:05')`).join(', ')};`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${r3Dates.map((_, i) => `(${78 + i}, 9)`).join(', ')};`);

  // Rule 4: Coffee <= 0/day (forbidden) — no coffee d1..d19 (met), 1 coffee today → yellow
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES (108, ?, '09:00', '09:05')`,
    [today],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (108, 10);`);

  // Rule 5: Pull-ups >= 3/week (countDays)
  //   Week Mar 30–Apr 5:  1 day  → broken (red)
  //   Week Apr  6–Apr 12: 3 days → met   (green)
  //   Week Apr 13–Apr 19: 4 days → met   (green)
  //   Week Apr 20–Apr 26: 2 days, today not done → broken (yellow)
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (109, ?, '17:00', '17:30'),
      (110, ?, '17:00', '17:30'),
      (111, ?, '17:00', '17:30'),
      (112, ?, '17:00', '17:30'),
      (113, ?, '17:00', '17:30'),
      (114, ?, '17:00', '17:30'),
      (115, ?, '17:00', '17:30'),
      (116, ?, '17:00', '17:30'),
      (117, ?, '17:00', '17:30'),
      (118, ?, '17:00', '17:30')`,
    [d(23), d(16), d(14), d(12), d(9), d(8), d(6), d(4), d(2), d(1)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (109,11),(110,11),(111,11),(112,11),(113,11),(114,11),(115,11),(116,11),(117,11),(118,11);`);

  // Rule 6: Dessert <= 1/week (countDays)
  //   Week Mar 30–Apr 5:  2 days → broken (red)
  //   Week Apr  6–Apr 12: 1 day  → met   (green)
  //   Week Apr 13–Apr 19: 0 days → met   (green)
  //   Week Apr 20–Apr 26: 0 days, today → met (blue)
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (119, ?, '19:00', '19:15'),
      (120, ?, '19:00', '19:15'),
      (121, ?, '19:00', '19:15')`,
    [d(23), d(20), d(14)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (119,12),(120,12),(121,12);`);

  // Rule 7: Yoga >= 8/month (countDays)
  //   March: 9 days → met (green)
  //   April: 3 days so far → broken (yellow)
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (122, ?, '07:00', '08:00'),
      (123, ?, '07:00', '08:00'),
      (124, ?, '07:00', '08:00'),
      (125, ?, '07:00', '08:00'),
      (126, ?, '07:00', '08:00'),
      (127, ?, '07:00', '08:00'),
      (128, ?, '07:00', '08:00'),
      (129, ?, '07:00', '08:00'),
      (130, ?, '07:00', '08:00'),
      (131, ?, '07:00', '08:00'),
      (132, ?, '07:00', '08:00'),
      (133, ?, '07:00', '08:00')`,
    [d(52), d(49), d(45), d(42), d(38), d(35), d(31), d(28), d(24), d(21), d(14), d(7)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (122,13),(123,13),(124,13),(125,13),(126,13),(127,13),(128,13),(129,13),(130,13),(131,13),(132,13),(133,13);`);

  // Rule 8: Journaling >= 5/month (countDays)
  //   February: 6 days → met   (green)
  //   March:    2 days → broken (red)
  //   April:    2 days so far → broken (yellow)
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (134, ?, '23:00', '23:20'),
      (135, ?, '23:00', '23:20'),
      (136, ?, '23:00', '23:20'),
      (137, ?, '23:00', '23:20'),
      (138, ?, '23:00', '23:20'),
      (139, ?, '23:00', '23:20'),
      (140, ?, '23:00', '23:20'),
      (141, ?, '23:00', '23:20'),
      (142, ?, '23:00', '23:20'),
      (143, ?, '23:00', '23:20')`,
    [d(80), d(76), d(72), d(68), d(63), d(59), d(45), d(31), d(14), today],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (134,14),(135,14),(136,14),(137,14),(138,14),(139,14),(140,14),(141,14),(142,14),(143,14);`);

  // ── Rules 1–8 ─────────────────────────────────────────────────────────────
  await sqlite.run(
    `INSERT OR REPLACE INTO rules (id, subjectType, subjectId, metric, operator, value, period, startDate) VALUES
      (1, 'action',  7, 'count',     '>=', 1, 'day',   ?),
      (2, 'action',  8, 'count',     '>=', 1, 'day',   ?),
      (3, 'action',  9, 'count',     '<=', 1, 'day',   ?),
      (4, 'action', 10, 'count',     '<=', 0, 'day',   ?),
      (5, 'action', 11, 'countDays', '>=', 3, 'week',  ?),
      (6, 'action', 12, 'countDays', '<=', 1, 'week',  ?),
      (7, 'action', 13, 'countDays', '>=', 8, 'month', ?),
      (8, 'action', 14, 'countDays', '>=', 5, 'month', ?)`,
    [d(34), d(25), d(29), d(19), d(23), d(23), d(52), d(80)],
  );
}
