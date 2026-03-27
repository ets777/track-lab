import { TestBed } from '@angular/core/testing';
import { AchievementService } from './achievement.service';
import { ActivityService } from './activity.service';
import { MetricService } from './metric.service';
import { ActivityMetricService } from './activity-metric.service';
import { HookService } from './hook.service';
import { DatabaseRouter } from './db/database-router.service';
import { IAchievementDb } from '../db/models/achievement';
import { IMetricDb } from '../db/models/metric';
import { IActivityMetricDb } from '../db/models/activity-metric';

// Shared test fixtures
const lockedAchievement = (code: string): IAchievementDb => ({
  id: 1,
  code,
  icon: '🌞',
  title: 'Test',
  description: 'Test',
  target: 1,
  current: 0,
  unlocked: false,
});

const moodMetric: IMetricDb = {
  id: 10,
  name: 'TK_MOOD',
  isHidden: false,
  isBase: true,
  step: 1,
  minValue: 1,
  maxValue: 10,
};

const energyMetric: IMetricDb = {
  id: 11,
  name: 'TK_ENERGY',
  isHidden: false,
  isBase: true,
  step: 1,
  minValue: 1,
  maxValue: 10,
};

const metricRecord = (metricId: number, value: number): IActivityMetricDb => ({
  id: 1,
  activityId: 1,
  metricId,
  value,
});

describe('AchievementService - mood/energy init checks', () => {
  let service: AchievementService;
  let activityService: jasmine.SpyObj<ActivityService>;
  let metricService: jasmine.SpyObj<MetricService>;
  let activityMetricService: jasmine.SpyObj<ActivityMetricService>;

  beforeEach(() => {
    const activitySpy = jasmine.createSpyObj<ActivityService>(
      'ActivityService',
      ['getAllByRange', 'getEnriched', 'count', 'getById'],
    );
    const metricSpy = jasmine.createSpyObj<MetricService>(
      'MetricService',
      ['getFirstWhereEquals'],
    );
    const activityMetricSpy = jasmine.createSpyObj<ActivityMetricService>(
      'ActivityMetricService',
      ['getAllWhereEquals', 'getByMetricIdInValueRange'],
    );
    const hookSpy = jasmine.createSpyObj<HookService>(
      'HookService',
      ['onEvent', 'emit'],
    );
    hookSpy.onEvent.and.returnValue({ subscribe: () => {} } as any);

    const dbRouterSpy = jasmine.createSpyObj<DatabaseRouter>('DatabaseRouter', [
      'getFirstWhereEquals', 'update', 'getAll', 'add', 'bulkAdd',
      'getById', 'getAllWhereEquals', 'delete', 'count',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AchievementService,
        { provide: ActivityService, useValue: activitySpy },
        { provide: MetricService, useValue: metricSpy },
        { provide: ActivityMetricService, useValue: activityMetricSpy },
        { provide: HookService, useValue: hookSpy },
        { provide: DatabaseRouter, useValue: dbRouterSpy },
      ],
    });

    service = TestBed.inject(AchievementService);
    activityService = TestBed.inject(ActivityService) as jasmine.SpyObj<ActivityService>;
    metricService = TestBed.inject(MetricService) as jasmine.SpyObj<MetricService>;
    activityMetricService = TestBed.inject(ActivityMetricService) as jasmine.SpyObj<ActivityMetricService>;

    // Spy on the achievement's own DB methods so we can assert on update calls
    // without needing a real SQLite connection.
    spyOn(service, 'getByCode').and.callFake((code) =>
      Promise.resolve(lockedAchievement(code)),
    );
    spyOn(service as any, 'update').and.returnValue(Promise.resolve(1));
    spyOn(service as any, 'enqueue');
  });

  // ─── max_mood ──────────────────────────────────────────────────────────────

  describe('checkMaxMoodAchievementInit', () => {
    it('should unlock max_mood when a mood metric record with value >= 9 exists', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(moodMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([metricRecord(moodMetric.id, 9)]),
      );

      await service.checkMaxMoodAchievementInit();

      expect((service as any).update).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ unlocked: true }),
      );
    });

    it('should NOT unlock max_mood when all mood metric records have value < 9', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(moodMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([]),
      );

      await service.checkMaxMoodAchievementInit();

      expect((service as any).update).not.toHaveBeenCalled();
    });

    it('should NOT call activityService.getAllByRange with the deprecated mood column', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(undefined));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(Promise.resolve([]));

      await service.checkMaxMoodAchievementInit();

      expect(activityService.getAllByRange).not.toHaveBeenCalledWith(
        'mood',
        jasmine.anything(),
      );
    });
  });

  // ─── min_mood ──────────────────────────────────────────────────────────────

  describe('checkMinMoodAchievementInit', () => {
    it('should unlock min_mood when a mood metric record with value <= 2 exists', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(moodMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([metricRecord(moodMetric.id, 1)]),
      );

      await service.checkMinMoodAchievementInit();

      expect((service as any).update).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ unlocked: true }),
      );
    });

    it('should NOT unlock min_mood when all mood metric records have value > 2', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(moodMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([]),
      );

      await service.checkMinMoodAchievementInit();

      expect((service as any).update).not.toHaveBeenCalled();
    });

    it('should NOT call activityService.getAllByRange with the deprecated mood column', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(undefined));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(Promise.resolve([]));

      await service.checkMinMoodAchievementInit();

      expect(activityService.getAllByRange).not.toHaveBeenCalledWith(
        'mood',
        jasmine.anything(),
      );
    });
  });

  // ─── max_energy ────────────────────────────────────────────────────────────

  describe('checkMaxEnergyAchievementInit', () => {
    it('should unlock max_energy when an energy metric record with value >= 9 exists', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(energyMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([metricRecord(energyMetric.id, 10)]),
      );

      await service.checkMaxEnergyAchievementInit();

      expect((service as any).update).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ unlocked: true }),
      );
    });

    it('should NOT unlock max_energy when all energy metric records have value < 9', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(energyMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([]),
      );

      await service.checkMaxEnergyAchievementInit();

      expect((service as any).update).not.toHaveBeenCalled();
    });

    it('should NOT call activityService.getAllByRange with the deprecated energy column', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(undefined));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(Promise.resolve([]));

      await service.checkMaxEnergyAchievementInit();

      expect(activityService.getAllByRange).not.toHaveBeenCalledWith(
        'energy',
        jasmine.anything(),
      );
    });
  });

  // ─── min_energy ────────────────────────────────────────────────────────────

  describe('checkMinEnergyAchievementInit', () => {
    it('should unlock min_energy when an energy metric record with value <= 2 exists', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(energyMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([metricRecord(energyMetric.id, 2)]),
      );

      await service.checkMinEnergyAchievementInit();

      expect((service as any).update).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ unlocked: true }),
      );
    });

    it('should NOT unlock min_energy when all energy metric records have value > 2', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(energyMetric));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(
        Promise.resolve([]),
      );

      await service.checkMinEnergyAchievementInit();

      expect((service as any).update).not.toHaveBeenCalled();
    });

    it('should NOT call activityService.getAllByRange with the deprecated energy column', async () => {
      metricService.getFirstWhereEquals.and.returnValue(Promise.resolve(undefined));
      activityMetricService.getByMetricIdInValueRange.and.returnValue(Promise.resolve([]));

      await service.checkMinEnergyAchievementInit();

      expect(activityService.getAllByRange).not.toHaveBeenCalledWith(
        'energy',
        jasmine.anything(),
      );
    });
  });
});
