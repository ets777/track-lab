import { TestBed } from '@angular/core/testing';
import { ActionService } from './action.service';
import { ActivityActionService } from './activity-action.service';
import { TagService } from './tag.service';
import { ActionTagService } from './action-tag.service';
import { DatabaseRouter } from './db/database-router.service';
import { IActionDb } from '../db/models/action';
import { IActivityActionDb } from '../db/models/activity-action';

const actionDb = (id: number, name: string): IActionDb => ({
  id,
  name,
  isHidden: false,
});

const activityActionDb = (id: number, activityId: number, actionId: number): IActivityActionDb => ({
  id,
  activityId,
  actionId,
});

describe('ActionService.updateFromString', () => {
  let service: ActionService;
  let activityActionService: jasmine.SpyObj<ActivityActionService>;
  let dbRouter: jasmine.SpyObj<DatabaseRouter>;

  beforeEach(() => {
    const activityActionSpy = jasmine.createSpyObj<ActivityActionService>(
      'ActivityActionService',
      ['getByActivityId', 'deleteByActivityIdAndActionId', 'add', 'getAllWhereEquals'],
    );
    const tagSpy = jasmine.createSpyObj<TagService>('TagService', ['getByActionId']);
    const actionTagSpy = jasmine.createSpyObj<ActionTagService>('ActionTagService', ['deleteByActionId']);
    const dbRouterSpy = jasmine.createSpyObj<DatabaseRouter>('DatabaseRouter', [
      'add', 'getById', 'getAll', 'getAllWhereEquals', 'getFirstWhereEquals',
      'getFirstWhereEqualsIgnoringCase', 'update', 'delete', 'getAnyOf',
      'bulkAdd', 'count', 'getLast', 'getLastBeforeDate', 'getAllBetweenOrderedBy',
      'getAllByRange', 'clear',
    ]);

    activityActionSpy.getByActivityId.and.returnValue(Promise.resolve([]));
    activityActionSpy.add.and.returnValue(Promise.resolve(0));
    activityActionSpy.deleteByActivityIdAndActionId.and.returnValue(Promise.resolve());
    tagSpy.getByActionId.and.returnValue(Promise.resolve([]));
    dbRouterSpy.getAnyOf.and.returnValue(Promise.resolve([]));
    dbRouterSpy.getFirstWhereEqualsIgnoringCase.and.returnValue(Promise.resolve(undefined));
    dbRouterSpy.add.and.returnValue(Promise.resolve(10));

    TestBed.configureTestingModule({
      providers: [
        ActionService,
        { provide: ActivityActionService, useValue: activityActionSpy },
        { provide: TagService, useValue: tagSpy },
        { provide: ActionTagService, useValue: actionTagSpy },
        { provide: DatabaseRouter, useValue: dbRouterSpy },
      ],
    });

    service = TestBed.inject(ActionService);
    activityActionService = TestBed.inject(ActivityActionService) as jasmine.SpyObj<ActivityActionService>;
    dbRouter = TestBed.inject(DatabaseRouter) as jasmine.SpyObj<DatabaseRouter>;
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('when an action is removed', () => {
    it('should delete the activityAction reference for the removed action', async () => {
      activityActionService.getByActivityId.and.returnValue(
        Promise.resolve([activityActionDb(1, 5, 1)]),
      );
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([actionDb(1, 'running')]));

      await service.updateFromString('', 5);

      expect(activityActionService.deleteByActivityIdAndActionId).toHaveBeenCalledWith(5, 1);
    });

    it('should not call add when the removed action has no replacement', async () => {
      activityActionService.getByActivityId.and.returnValue(
        Promise.resolve([activityActionDb(1, 5, 1)]),
      );
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([actionDb(1, 'running')]));

      spyOn(service, 'addWithRelation');

      await service.updateFromString('', 5);

      expect(service.addWithRelation).not.toHaveBeenCalled();
    });
  });

  // ─── add ───────────────────────────────────────────────────────────────────

  describe('when a new action is added', () => {
    it('should create a new action and add a reference when the action does not exist', async () => {
      activityActionService.getByActivityId.and.returnValue(Promise.resolve([]));
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([]));
      dbRouter.getFirstWhereEqualsIgnoringCase.and.returnValue(Promise.resolve(undefined));
      dbRouter.add.and.returnValue(Promise.resolve(42));

      await service.updateFromString('running', 5);

      expect(dbRouter.add).toHaveBeenCalledWith('actions', jasmine.objectContaining({ name: 'running' }));
      expect(activityActionService.add).toHaveBeenCalledWith({ activityId: 5, actionId: 42 });
    });

    it('should reuse an existing action and only add the reference when the action already exists', async () => {
      activityActionService.getByActivityId.and.returnValue(Promise.resolve([]));
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([]));
      dbRouter.getFirstWhereEqualsIgnoringCase.and.returnValue(
        Promise.resolve(actionDb(7, 'running')),
      );

      await service.updateFromString('running', 5);

      expect(dbRouter.add).not.toHaveBeenCalledWith('actions', jasmine.anything());
      expect(activityActionService.add).toHaveBeenCalledWith({ activityId: 5, actionId: 7 });
    });

    it('should not call deleteByActivityIdAndActionId when nothing was removed', async () => {
      activityActionService.getByActivityId.and.returnValue(Promise.resolve([]));
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([]));
      dbRouter.getFirstWhereEqualsIgnoringCase.and.returnValue(Promise.resolve(undefined));
      dbRouter.add.and.returnValue(Promise.resolve(42));

      await service.updateFromString('cycling', 5);

      expect(activityActionService.deleteByActivityIdAndActionId).not.toHaveBeenCalled();
    });
  });

  // ─── edit (rename) ─────────────────────────────────────────────────────────

  describe('when an action is renamed (old removed, new added)', () => {
    it('should delete the reference for the old name', async () => {
      activityActionService.getByActivityId.and.returnValue(
        Promise.resolve([activityActionDb(1, 5, 2)]),
      );
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([actionDb(2, 'walking')]));
      dbRouter.getFirstWhereEqualsIgnoringCase.and.returnValue(Promise.resolve(undefined));
      dbRouter.add.and.returnValue(Promise.resolve(99));

      await service.updateFromString('running', 5);

      expect(activityActionService.deleteByActivityIdAndActionId).toHaveBeenCalledWith(5, 2);
    });

    it('should add a reference for the new name', async () => {
      activityActionService.getByActivityId.and.returnValue(
        Promise.resolve([activityActionDb(1, 5, 2)]),
      );
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([actionDb(2, 'walking')]));
      dbRouter.getFirstWhereEqualsIgnoringCase.and.returnValue(Promise.resolve(undefined));
      dbRouter.add.and.returnValue(Promise.resolve(99));

      await service.updateFromString('running', 5);

      expect(dbRouter.add).toHaveBeenCalledWith('actions', jasmine.objectContaining({ name: 'running' }));
      expect(activityActionService.add).toHaveBeenCalledWith({ activityId: 5, actionId: 99 });
    });

    it('should reuse an existing action for the new name when it already exists', async () => {
      activityActionService.getByActivityId.and.returnValue(
        Promise.resolve([activityActionDb(1, 5, 2)]),
      );
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([actionDb(2, 'walking')]));
      dbRouter.getFirstWhereEqualsIgnoringCase.and.returnValue(
        Promise.resolve(actionDb(15, 'running')),
      );

      await service.updateFromString('running', 5);

      expect(activityActionService.deleteByActivityIdAndActionId).toHaveBeenCalledWith(5, 2);
      expect(activityActionService.add).toHaveBeenCalledWith({ activityId: 5, actionId: 15 });
    });
  });

  // ─── no change ─────────────────────────────────────────────────────────────

  describe('when the action list is unchanged', () => {
    it('should not delete or add any references', async () => {
      activityActionService.getByActivityId.and.returnValue(
        Promise.resolve([activityActionDb(1, 5, 3)]),
      );
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([actionDb(3, 'cycling')]));

      spyOn(service, 'addWithRelation');

      await service.updateFromString('cycling', 5);

      expect(activityActionService.deleteByActivityIdAndActionId).not.toHaveBeenCalled();
      expect(service.addWithRelation).not.toHaveBeenCalled();
    });
  });

  // ─── multiple actions ──────────────────────────────────────────────────────

  describe('when working with multiple actions', () => {
    it('should handle adding multiple new actions at once', async () => {
      activityActionService.getByActivityId.and.returnValue(Promise.resolve([]));
      dbRouter.getAnyOf.and.returnValue(Promise.resolve([]));
      dbRouter.getFirstWhereEqualsIgnoringCase.and.returnValue(Promise.resolve(undefined));
      dbRouter.add.and.returnValues(
        Promise.resolve(10),
        Promise.resolve(11),
      );

      await service.updateFromString('running, cycling', 5);

      expect(activityActionService.add).toHaveBeenCalledTimes(2);
    });

    it('should remove only the actions that are absent from the new list', async () => {
      activityActionService.getByActivityId.and.returnValue(
        Promise.resolve([
          activityActionDb(1, 5, 1),
          activityActionDb(2, 5, 2),
        ]),
      );
      dbRouter.getAnyOf.and.returnValue(
        Promise.resolve([actionDb(1, 'running'), actionDb(2, 'cycling')]),
      );

      // Keep "running", remove "cycling"
      await service.updateFromString('running', 5);

      expect(activityActionService.deleteByActivityIdAndActionId).toHaveBeenCalledOnceWith(5, 2);
      expect(activityActionService.deleteByActivityIdAndActionId).not.toHaveBeenCalledWith(5, 1);
    });
  });
});
