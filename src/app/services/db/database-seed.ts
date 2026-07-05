import { format, subDays, addDays } from 'date-fns';
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
    INSERT OR REPLACE INTO listLinks (listId, subjectType, subjectId) VALUES
      (2, 'action', 2);
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

  // ── Rule demo activities 18–156 ───────────────────────────────────────────

  // Rule 1: Daily Walk >= 1/day — 35 consecutive days d0..d34, today done → green
  const r1Dates = Array.from({ length: 35 }, (_, i) => d(i));
  await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES ${r1Dates.map((dt, i) => `(${18 + i}, '${dt}', '06:30', '07:00')`).join(', ')};`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${r1Dates.map((_, i) => `(${18 + i}, 7)`).join(', ')};`);

  // Rule 2: Evening Stretch >= 1/day — 25 days d1..d25, NOT today → yellow for today
  const r2Dates = Array.from({ length: 25 }, (_, i) => d(i + 1));
  await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES ${r2Dates.map((dt, i) => `(${53 + i}, '${dt}', '21:00', '21:20')`).join(', ')};`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${r2Dates.map((_, i) => `(${53 + i}, 8)`).join(', ')};`);

  // Rule 3: Cold Shower <= 1/day — 30 days d0..d29, today done → green
  const r3Dates = Array.from({ length: 30 }, (_, i) => d(i));
  await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES ${r3Dates.map((dt, i) => `(${78 + i}, '${dt}', '06:00', '06:05')`).join(', ')};`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${r3Dates.map((_, i) => `(${78 + i}, 9)`).join(', ')};`);

  // Rule 4: Coffee <= 0/day (forbidden) — 1 coffee today → red
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES (108, ?, '09:00', '09:05')`,
    [today],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (108, 10);`);

  // Rule 5: Pull-ups >= 3/week (countDays) — weeks Mon–Sun, today = Sun May 4
  //   Week Apr  7–13: 1 day  → broken (red)
  //   Week Apr 14–20: 3 days → met   (green)
  //   Week Apr 21–27: 3 days → met   (green)
  //   Week Apr 28–May 4: 3 days → met (green, current partial week)
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
    [d(25), d(20), d(18), d(15), d(13), d(11), d(9), d(6), d(4), d(1)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (109,11),(110,11),(111,11),(112,11),(113,11),(114,11),(115,11),(116,11),(117,11),(118,11);`);

  // Rule 6: Dessert <= 1/week (countDays)
  //   Week Apr  7–13: 2 days → broken (red)  — combined with pull-ups → week RED
  //   Week Apr 14–20: 1 day  → met   (green) — combined → week GREEN
  //   Week Apr 21–27: 0 days → met   (green) — combined → week GREEN
  //   Week Apr 28–May 4: 0 days → met (green) — combined → week GREEN
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (119, ?, '19:00', '19:15'),
      (120, ?, '19:00', '19:15'),
      (121, ?, '19:00', '19:15')`,
    [d(24), d(22), d(17)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (119,12),(120,12),(121,12);`);

  // Rule 7: Yoga >= 8/month (countDays)
  //   March: 8 days → met (green)
  //   April: 9 days → met (green)
  //   May:   3 days so far → broken (in-progress, only 4 days in)
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
      (133, ?, '07:00', '08:00'),
      (134, ?, '07:00', '08:00'),
      (135, ?, '07:00', '08:00'),
      (136, ?, '07:00', '08:00'),
      (137, ?, '07:00', '08:00'),
      (138, ?, '07:00', '08:00'),
      (139, ?, '07:00', '08:00'),
      (140, ?, '07:00', '08:00'),
      (141, ?, '07:00', '08:00')`,
    [d(61), d(58), d(54), d(51), d(47), d(44), d(40), d(37),
     d(33), d(30), d(27), d(24), d(20), d(17), d(13), d(10), d(7),
     d(3), d(2), d(0)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (122,13),(123,13),(124,13),(125,13),(126,13),(127,13),(128,13),(129,13),(130,13),(131,13),(132,13),(133,13),(134,13),(135,13),(136,13),(137,13),(138,13),(139,13),(140,13),(141,13);`);

  // Rule 8: Journaling >= 5/month (countDays)
  //   February: 5 days → met   (green)
  //   March:    2 days → broken (red)
  //   April:    6 days → met   (green)
  //   May:      2 days so far → broken (in-progress)
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (142, ?, '23:00', '23:20'),
      (143, ?, '23:00', '23:20'),
      (144, ?, '23:00', '23:20'),
      (145, ?, '23:00', '23:20'),
      (146, ?, '23:00', '23:20'),
      (147, ?, '23:00', '23:20'),
      (148, ?, '23:00', '23:20'),
      (149, ?, '23:00', '23:20'),
      (150, ?, '23:00', '23:20'),
      (151, ?, '23:00', '23:20'),
      (152, ?, '23:00', '23:20'),
      (153, ?, '23:00', '23:20'),
      (154, ?, '23:00', '23:20'),
      (155, ?, '23:00', '23:20'),
      (156, ?, '23:00', '23:20')`,
    [d(81), d(77), d(73), d(69), d(65), d(42), d(35), d(21), d(18), d(15), d(11), d(8), d(5), d(3), d(0)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (142,14),(143,14),(144,14),(145,14),(146,14),(147,14),(148,14),(149,14),(150,14),(151,14),(152,14),(153,14),(154,14),(155,14),(156,14);`);

  // ── Bulk history: 300 activities across last 150 days ────────────────────
  // 2 per day, actions 1-5 only (no rule-tracked actions), mood+energy metrics.
  // Purpose: makes enrichAll (4 queries/activity) slow without cache,
  //          instant on cached revisits.
  {
    const BULK_ACTIONS = [1, 2, 3, 4, 5]; // Running, Meditation, Reading, Gym, Cycling
    const BULK_ITEMS = [1, 3, 4]; // Happy, Focused, Tired
    const CHUNK = 150;

    const acts: string[] = [];
    const actActions: string[] = [];
    const actMetrics: string[] = [];
    const actItems: string[] = [];

    let bid = 200;
    for (let day = 35; day <= 184; day++) {
      const date = d(day);
      for (let slot = 0; slot < 2; slot++) {
        const actionId = BULK_ACTIONS[(day * 2 + slot) % BULK_ACTIONS.length];
        const itemId = BULK_ITEMS[(day + slot) % BULK_ITEMS.length];
        const startH = slot === 0 ? '07' : '17';
        const endH   = slot === 0 ? '08' : '18';
        const mood   = 1 + (day * 2 + slot) % 10;
        const energy = 1 + (day + slot * 7) % 10;

        acts.push(`(${bid}, '${date}', '${startH}:00', '${endH}:00')`);
        actActions.push(`(${bid}, ${actionId})`);
        actMetrics.push(`(${bid}, 1, ${mood})`);
        actMetrics.push(`(${bid}, 2, ${energy})`);
        actItems.push(`(${bid}, ${itemId})`);
        bid++;
      }
    }

    for (let i = 0; i < acts.length; i += CHUNK) {
      await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES ${acts.slice(i, i + CHUNK).join(',')};`);
    }
    for (let i = 0; i < actActions.length; i += CHUNK) {
      await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${actActions.slice(i, i + CHUNK).join(',')};`);
    }
    for (let i = 0; i < actMetrics.length; i += CHUNK) {
      await sqlite.execute(`INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES ${actMetrics.slice(i, i + CHUNK).join(',')};`);
    }
    for (let i = 0; i < actItems.length; i += CHUNK) {
      await sqlite.execute(`INSERT OR REPLACE INTO activityItems (activityId, itemId) VALUES ${actItems.slice(i, i + CHUNK).join(',')};`);
    }
  }

  // ── Recent demo history: dense last 30 days for graph widgets ─────────────
  // Bulk history above stops 35 days ago, leaving the 1w/2w/1m widget windows
  // sparse. Add a daily Cycling (action 5) activity with Mood (1) + Energy (2)
  // metrics so the metric-graph (Mood) and library-graph (Cycling) widgets have
  // rich, smooth recent data to render.
  {
    const recActs: string[] = [];
    const recActions: string[] = [];
    const recMetrics: string[] = [];
    const recItems: string[] = [];
    let rid = 700;
    for (let day = 0; day <= 29; day++) {
      const date = d(day);
      const mood   = Math.max(1, Math.min(10, Math.round(5.5 + 3 * Math.sin(day / 4))));
      const energy = Math.max(1, Math.min(10, Math.round(5.5 + 3 * Math.cos(day / 5))));
      recActs.push(`(${rid}, '${date}', '18:00', '19:00', 'Cycling route')`);
      recActions.push(`(${rid}, 5)`);
      recMetrics.push(`(${rid}, 1, ${mood})`);
      recMetrics.push(`(${rid}, 2, ${energy})`);
      recItems.push(`(${rid}, 1)`); // Happy
      rid++;
    }
    await sqlite.execute(`INSERT OR REPLACE INTO activities (id, date, startTime, endTime, comment) VALUES ${recActs.join(',')};`);
    await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES ${recActions.join(',')};`);
    await sqlite.execute(`INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES ${recMetrics.join(',')};`);
    await sqlite.execute(`INSERT OR REPLACE INTO activityItems (activityId, itemId) VALUES ${recItems.join(',')};`);
  }

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
    [d(34), d(25), d(29), d(19), d(27), d(27), d(61), d(81)],
  );

  // ── Experiment demo ────────────────────────────────────────────────────────

  // Experiment 1: in progress (started 30 days ago, ends in 30 days)
  await sqlite.run(
    `INSERT OR REPLACE INTO experiments (id, title, startDate, endDate, factEndDate, isSuccess, resultData) VALUES (1, 'Well-being experiment', ?, ?, NULL, NULL, NULL)`,
    [d(30), format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd')],
  );
  await sqlite.execute(`
    INSERT OR REPLACE INTO experimentIndicators (id, experimentId, subjectType, subjectId, direction) VALUES
      (1, 1, 'metric', 1, 'increasing'),
      (2, 1, 'metric', 2, 'increasing'),
      (5, 1, 'action', 1, 'increasing');
  `);
  await sqlite.execute(`
    INSERT OR REPLACE INTO experimentRules (id, experimentId, ruleId) VALUES
      (1, 1, 1),
      (2, 1, 7);
  `);

  // Experiment 2: SUCCESS — Weight loss (started 65 days ago, ended 5 days ago)
  // Baseline [d(72)..d(66)]: weight ~82.66 kg; last week [d(11)..d(5)]: weight ~78.61 kg → decreased ✓
  const exp2ResultData = JSON.stringify([{ indicatorType: 'metric', indicatorId: 3, initialValue: 82.7, resultValue: 78.6 }]);
  await sqlite.run(
    `INSERT OR REPLACE INTO experiments (id, title, startDate, endDate, factEndDate, isSuccess, resultData) VALUES (2, 'Weight loss challenge', ?, ?, ?, 1, ?)`,
    [d(65), d(5), d(5), exp2ResultData],
  );
  await sqlite.execute(`
    INSERT OR REPLACE INTO experimentIndicators (id, experimentId, subjectType, subjectId, direction) VALUES
      (3, 2, 'metric', 3, 'decreasing');
  `);
  // Baseline weight activities (d72..d66) — ids 600-606
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (600, ?, '08:00', '08:05'), (601, ?, '08:00', '08:05'), (602, ?, '08:00', '08:05'),
      (603, ?, '08:00', '08:05'), (604, ?, '08:00', '08:05'), (605, ?, '08:00', '08:05'), (606, ?, '08:00', '08:05')`,
    [d(72), d(71), d(70), d(69), d(68), d(67), d(66)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (600,3),(601,3),(602,3),(603,3),(604,3),(605,3),(606,3);`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES (600,3,83.1),(601,3,82.8),(602,3,82.5),(603,3,82.9),(604,3,82.3),(605,3,82.6),(606,3,82.4);`);
  // Last-week weight activities (d11..d5) — ids 607-613
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (607, ?, '08:00', '08:05'), (608, ?, '08:00', '08:05'), (609, ?, '08:00', '08:05'),
      (610, ?, '08:00', '08:05'), (611, ?, '08:00', '08:05'), (612, ?, '08:00', '08:05'), (613, ?, '08:00', '08:05')`,
    [d(11), d(10), d(9), d(8), d(7), d(6), d(5)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (607,3),(608,3),(609,3),(610,3),(611,3),(612,3),(613,3);`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES (607,3,79.0),(608,3,78.8),(609,3,78.5),(610,3,78.7),(611,3,78.3),(612,3,78.6),(613,3,78.4);`);
  await sqlite.execute(`INSERT OR REPLACE INTO experimentRules (id, experimentId, ruleId) VALUES (3, 2, 7);`);

  // Experiment 3: FAILED — Mood improvement (started 50 days ago, ended 15 days ago)
  // Baseline [d(57)..d(51)]: mood ~7.1; last week [d(21)..d(15)]: mood ~3.9 → expected increasing but decreased ✗
  const exp3ResultData = JSON.stringify([{ indicatorType: 'metric', indicatorId: 1, initialValue: 7.1, resultValue: 3.9 }]);
  await sqlite.run(
    `INSERT OR REPLACE INTO experiments (id, title, startDate, endDate, factEndDate, isSuccess, failReasonId, resultData) VALUES (3, 'Mood improvement', ?, ?, ?, 0, 3, ?)`,
    [d(50), d(15), d(15), exp3ResultData],
  );
  await sqlite.execute(`
    INSERT OR REPLACE INTO experimentIndicators (id, experimentId, subjectType, subjectId, direction) VALUES
      (4, 3, 'metric', 1, 'increasing');
  `);
  // Baseline mood activities (d57..d51) — ids 620-626
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (620, ?, '20:00', '20:05'), (621, ?, '20:00', '20:05'), (622, ?, '20:00', '20:05'),
      (623, ?, '20:00', '20:05'), (624, ?, '20:00', '20:05'), (625, ?, '20:00', '20:05'), (626, ?, '20:00', '20:05')`,
    [d(57), d(56), d(55), d(54), d(53), d(52), d(51)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (620,1),(621,1),(622,1),(623,1),(624,1),(625,1),(626,1);`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES (620,1,7),(621,1,7),(622,1,8),(623,1,6),(624,1,7),(625,1,7),(626,1,8);`);
  // Last-week mood activities (d21..d15) — ids 627-633
  await sqlite.run(
    `INSERT OR REPLACE INTO activities (id, date, startTime, endTime) VALUES
      (627, ?, '20:00', '20:05'), (628, ?, '20:00', '20:05'), (629, ?, '20:00', '20:05'),
      (630, ?, '20:00', '20:05'), (631, ?, '20:00', '20:05'), (632, ?, '20:00', '20:05'), (633, ?, '20:00', '20:05')`,
    [d(21), d(20), d(19), d(18), d(17), d(16), d(15)],
  );
  await sqlite.execute(`INSERT OR REPLACE INTO activityActions (activityId, actionId) VALUES (627,1),(628,1),(629,1),(630,1),(631,1),(632,1),(633,1);`);
  await sqlite.execute(`INSERT OR REPLACE INTO activityMetrics (activityId, metricId, value) VALUES (627,1,4),(628,1,4),(629,1,3),(630,1,5),(631,1,4),(632,1,3),(633,1,4);`);
  await sqlite.execute(`INSERT OR REPLACE INTO experimentRules (id, experimentId, ruleId) VALUES (4, 3, 2),(5, 3, 8);`);

  // ── Widget layout test experiments 4–9 ───────────────────────────────────
  // Purpose: test widget appearance with 1 to 6 lines of content.
  // Lines = indicators + (rules section: uptime + up to 2 rule names).
  const fu = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');

  await sqlite.run(
    `INSERT OR REPLACE INTO experiments (id, title, startDate, endDate, factEndDate, isSuccess, resultData) VALUES
      (4, 'Focus tracker',     ?, ?, NULL, NULL, NULL),
      (5, 'Energy boost',      ?, ?, NULL, NULL, NULL),
      (6, 'Triple indicator',  ?, ?, NULL, NULL, NULL),
      (7, 'Morning routine',   ?, ?, NULL, NULL, NULL),
      (8, 'Active lifestyle',  ?, ?, NULL, NULL, NULL),
      (9, 'Ultimate wellness', ?, ?, NULL, NULL, NULL)`,
    [
      d(20), fu(10),
      d(15), fu(15),
      d(25), fu(5),
      d(20), fu(10),
      d(18), fu(12),
      d(28), fu(2),
    ],
  );

  // Exp 4: 1 ind, 0 rules → 1 line
  // Exp 5: 2 ind, 0 rules → 2 lines
  // Exp 6: 3 ind, 0 rules → 3 lines
  // Exp 7: 2 ind, 1 rule  → 4 lines (2 ind + uptime + 1 rule)
  // Exp 8: 2 ind, 2 rules → 5 lines (2 ind + uptime + 2 rules)
  // Exp 9: 3 ind, 3 rules → 6 lines (3 ind + uptime + 2 rules capped)
  await sqlite.execute(`
    INSERT OR REPLACE INTO experimentIndicators (id, experimentId, subjectType, subjectId, direction) VALUES
      (6,  4, 'action', 3,  'increasing'),
      (7,  5, 'metric', 1,  'increasing'),
      (8,  5, 'action', 1,  'increasing'),
      (9,  6, 'metric', 1,  'increasing'),
      (10, 6, 'metric', 2,  'increasing'),
      (11, 6, 'action', 4,  'increasing'),
      (12, 7, 'metric', 1,  'increasing'),
      (13, 7, 'action', 1,  'increasing'),
      (14, 8, 'metric', 2,  'increasing'),
      (15, 8, 'action', 4,  'increasing'),
      (16, 9, 'metric', 1,  'increasing'),
      (17, 9, 'metric', 2,  'increasing'),
      (18, 9, 'action', 13, 'increasing');
  `);

  await sqlite.execute(`
    INSERT OR REPLACE INTO experimentRules (id, experimentId, ruleId) VALUES
      (6,  7, 1),
      (7,  8, 1), (8,  8, 2),
      (9,  9, 1), (10, 9, 7), (11, 9, 8);
  `);
}
