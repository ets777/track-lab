import { TestBed } from '@angular/core/testing';
import { ItemService } from './item.service';
import { ActivityItemService } from './activity-item.service';
import { SubjectReferenceService } from './subject-reference.service';
import { DatabaseRouter } from './db/database-router.service';
import { IItemDb } from '../db/models/item';

const item = (id: number, name: string): IItemDb => ({
  id,
  name,
  listId: 1,
  isHidden: false,
});

describe('ItemService.deleteIfUnused', () => {
  let service: ItemService;
  let subjectReferenceService: jasmine.SpyObj<SubjectReferenceService>;
  let dbRouter: jasmine.SpyObj<DatabaseRouter>;

  beforeEach(() => {
    const activityItemSpy = jasmine.createSpyObj<ActivityItemService>(
      'ActivityItemService',
      ['getByActivityId'],
    );
    const subjectRefSpy = jasmine.createSpyObj<SubjectReferenceService>(
      'SubjectReferenceService',
      ['findSubjectUsage', 'removeSubjectReferences'],
    );
    const dbRouterSpy = jasmine.createSpyObj<DatabaseRouter>('DatabaseRouter', [
      'add', 'getById', 'getAll', 'getAllWhereEquals', 'getFirstWhereEquals',
      'getFirstWhereEqualsIgnoringCase', 'update', 'delete', 'getAnyOf',
      'bulkAdd', 'count', 'getLast', 'getLastBeforeDate', 'getAllBetweenOrderedBy',
      'getAllByRange', 'clear',
    ]);

    subjectRefSpy.findSubjectUsage.and.resolveTo(null);
    subjectRefSpy.removeSubjectReferences.and.resolveTo();
    dbRouterSpy.getById.and.resolveTo(item(7, 'Coffee'));
    dbRouterSpy.delete.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        ItemService,
        { provide: ActivityItemService, useValue: activityItemSpy },
        { provide: SubjectReferenceService, useValue: subjectRefSpy },
        { provide: DatabaseRouter, useValue: dbRouterSpy },
      ],
    });

    service = TestBed.inject(ItemService);
    subjectReferenceService = TestBed.inject(SubjectReferenceService) as jasmine.SpyObj<SubjectReferenceService>;
    dbRouter = TestBed.inject(DatabaseRouter) as jasmine.SpyObj<DatabaseRouter>;
  });

  it('should delete the item when nothing references it', async () => {
    expect(await service.deleteIfUnused(7)).toBeNull();
    expect(dbRouter.delete).toHaveBeenCalledWith('items', { id: 7 });
  });

  it('should clean up the non-blocking links when it deletes', async () => {
    await service.deleteIfUnused(7);

    expect(subjectReferenceService.removeSubjectReferences).toHaveBeenCalledWith('item', 7);
  });

  it('should refuse and name the item when a rule still points at it', async () => {
    subjectReferenceService.findSubjectUsage.and.resolveTo('rule');

    expect(await service.deleteIfUnused(7)).toEqual({ usage: 'rule', name: 'Coffee' });
  });

  it('should leave the item and its references intact when refused', async () => {
    subjectReferenceService.findSubjectUsage.and.resolveTo('experiment');

    await service.deleteIfUnused(7);

    expect(dbRouter.delete).not.toHaveBeenCalled();
    expect(subjectReferenceService.removeSubjectReferences).not.toHaveBeenCalled();
  });
});
