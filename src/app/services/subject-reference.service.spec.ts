import { TestBed } from '@angular/core/testing';
import { SubjectReferenceService } from './subject-reference.service';
import { RuleService } from './rule.service';
import { ExperimentIndicatorService } from './experiment-indicator.service';
import { ListLinkService } from './list-link.service';
import { DashboardConfigService } from './dashboard-config.service';
import { ItemService } from './item.service';
import { IItemDb } from '../db/models/item';
import { DashboardWidget } from '../types/dashboard-widget';

const item = (id: number, name: string): IItemDb => ({
  id,
  name,
  listId: 1,
  isHidden: false,
});

const libraryWidget = (itemId: number): DashboardWidget => ({
  id: 'w1',
  config: {
    type: 'library-graph',
    itemId,
    itemName: 'Coffee',
    itemType: 'item',
    period: '1w',
  },
});

describe('SubjectReferenceService.findListItemUsage', () => {
  let service: SubjectReferenceService;
  let ruleService: jasmine.SpyObj<RuleService>;
  let indicatorService: jasmine.SpyObj<ExperimentIndicatorService>;
  let dashboardConfigService: jasmine.SpyObj<DashboardConfigService>;
  let itemService: jasmine.SpyObj<ItemService>;

  beforeEach(() => {
    const ruleSpy = jasmine.createSpyObj<RuleService>('RuleService', ['getAll', 'deleteWithRelations']);
    const indicatorSpy = jasmine.createSpyObj<ExperimentIndicatorService>(
      'ExperimentIndicatorService',
      ['getAll', 'delete'],
    );
    const listLinkSpy = jasmine.createSpyObj<ListLinkService>('ListLinkService', ['delete']);
    const dashboardSpy = jasmine.createSpyObj<DashboardConfigService>(
      'DashboardConfigService',
      ['getWidgets', 'save'],
    );
    const itemSpy = jasmine.createSpyObj<ItemService>('ItemService', ['getAllWhereEquals']);

    ruleSpy.getAll.and.resolveTo([]);
    indicatorSpy.getAll.and.resolveTo([]);
    dashboardSpy.getWidgets.and.resolveTo([]);
    itemSpy.getAllWhereEquals.and.resolveTo([item(7, 'Coffee')]);

    TestBed.configureTestingModule({
      providers: [
        SubjectReferenceService,
        { provide: RuleService, useValue: ruleSpy },
        { provide: ExperimentIndicatorService, useValue: indicatorSpy },
        { provide: ListLinkService, useValue: listLinkSpy },
        { provide: DashboardConfigService, useValue: dashboardSpy },
        { provide: ItemService, useValue: itemSpy },
      ],
    });

    service = TestBed.inject(SubjectReferenceService);
    ruleService = TestBed.inject(RuleService) as jasmine.SpyObj<RuleService>;
    indicatorService = TestBed.inject(ExperimentIndicatorService) as jasmine.SpyObj<ExperimentIndicatorService>;
    dashboardConfigService = TestBed.inject(DashboardConfigService) as jasmine.SpyObj<DashboardConfigService>;
    itemService = TestBed.inject(ItemService) as jasmine.SpyObj<ItemService>;
  });

  it('should report the item a rule still points at', async () => {
    ruleService.getAll.and.resolveTo([{ subjectId: 7 } as any]);

    expect(await service.findListItemUsage(1)).toEqual({ usage: 'rule', name: 'Coffee' });
  });

  it('should report the item an experiment indicator still points at', async () => {
    indicatorService.getAll.and.resolveTo([{ subjectId: 7 } as any]);

    expect(await service.findListItemUsage(1)).toEqual({ usage: 'experiment', name: 'Coffee' });
  });

  it('should report the item a dashboard widget still points at', async () => {
    dashboardConfigService.getWidgets.and.resolveTo([libraryWidget(7)]);

    expect(await service.findListItemUsage(1)).toEqual({ usage: 'widget', name: 'Coffee' });
  });

  it('should return null when nothing references any item of the list', async () => {
    ruleService.getAll.and.resolveTo([{ subjectId: 99 } as any]);
    indicatorService.getAll.and.resolveTo([{ subjectId: 99 } as any]);
    dashboardConfigService.getWidgets.and.resolveTo([libraryWidget(99)]);

    expect(await service.findListItemUsage(1)).toBeNull();
  });

  it('should return null for an empty list without querying the reference tables', async () => {
    itemService.getAllWhereEquals.and.resolveTo([]);

    expect(await service.findListItemUsage(1)).toBeNull();
    expect(ruleService.getAll).not.toHaveBeenCalled();
  });

  it('should name the first referenced item when several items are referenced', async () => {
    itemService.getAllWhereEquals.and.resolveTo([item(7, 'Coffee'), item(8, 'Tea')]);
    ruleService.getAll.and.resolveTo([{ subjectId: 8 } as any, { subjectId: 7 } as any]);

    expect(await service.findListItemUsage(1)).toEqual({ usage: 'rule', name: 'Coffee' });
  });

  describe('findSubjectUsage', () => {
    it('should report a rule pointing at the subject', async () => {
      ruleService.getAll.and.resolveTo([{ subjectId: 7 } as any]);

      expect(await service.findSubjectUsage('item', 7)).toBe('rule');
    });

    it('should report an experiment indicator pointing at the subject', async () => {
      indicatorService.getAll.and.resolveTo([{ subjectId: 7 } as any]);

      expect(await service.findSubjectUsage('item', 7)).toBe('experiment');
    });

    it('should report a dashboard widget pointing at the subject', async () => {
      dashboardConfigService.getWidgets.and.resolveTo([libraryWidget(7)]);

      expect(await service.findSubjectUsage('item', 7)).toBe('widget');
    });

    it('should return null when nothing points at the subject', async () => {
      dashboardConfigService.getWidgets.and.resolveTo([libraryWidget(99)]);

      expect(await service.findSubjectUsage('item', 7)).toBeNull();
    });

    it('should not count a widget of another subject type with the same id', async () => {
      dashboardConfigService.getWidgets.and.resolveTo([libraryWidget(7)]);

      expect(await service.findSubjectUsage('tag', 7)).toBeNull();
    });
  });
});
