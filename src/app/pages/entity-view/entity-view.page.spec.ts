import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EntityViewPage } from './entity-view.page';
import { ActionService } from 'src/app/services/action.service';
import { ActivityService } from 'src/app/services/activity.service';
import { ActivityActionService } from 'src/app/services/activity-action.service';
import { TagService } from 'src/app/services/tag.service';
import { ItemService } from 'src/app/services/item.service';
import { ToastService } from 'src/app/services/toast.service';
import { LoadingService } from 'src/app/services/loading.service';
import { LogService } from 'src/app/services/log.service';
import { AlertController, ActionSheetController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { IActivity } from 'src/app/db/models/activity';
import { IAction } from 'src/app/db/models/action';
import { ITag } from 'src/app/db/models/tag';
import { IItem } from 'src/app/db/models/item';

const makeActivity = (overrides: Partial<IActivity> = {}): IActivity => ({
  id: 1,
  date: '2024-01-01',
  startTime: '10:00',
  endTime: '11:00',
  actions: [],
  tags: [],
  items: [],
  metricRecords: [],
  ...overrides,
});

const makeAction = (id: number, tags: ITag[] = []): IAction => ({
  id,
  name: `Action ${id}`,
  isHidden: false,
  tags,
});

const makeTag = (id: number): ITag => ({ id, name: `Tag ${id}`, isHidden: false });

const makeItem = (id: number): IItem => ({ id, name: `Item ${id}`, listId: 1, isHidden: false });

describe('EntityViewPage.activityMatchesEntity', () => {
  let component: EntityViewPage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        TranslateModule.forRoot(),
        EntityViewPage,
      ],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { entityType: 'action' }, paramMap: { get: () => '1' } } } },
        { provide: ActionService, useValue: jasmine.createSpyObj('ActionService', ['getEnriched']) },
        { provide: ActivityService, useValue: jasmine.createSpyObj('ActivityService', ['getByDate']) },
        { provide: ActivityActionService, useValue: jasmine.createSpyObj('ActivityActionService', ['getByActionId']) },
        { provide: TagService, useValue: jasmine.createSpyObj('TagService', ['getById']) },
        { provide: ItemService, useValue: jasmine.createSpyObj('ItemService', ['getById']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['enqueue']) },
        { provide: LoadingService, useValue: jasmine.createSpyObj('LoadingService', ['show', 'hide']) },
        { provide: LogService, useValue: jasmine.createSpyObj('LogService', ['error']) },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
        { provide: ActionSheetController, useValue: jasmine.createSpyObj('ActionSheetController', ['create']) },
      ],
    });

    component = TestBed.createComponent(EntityViewPage).componentInstance;
  });

  // ─── action ────────────────────────────────────────────────────────────────

  describe('when entityType is action', () => {
    beforeEach(() => {
      component.entityType = 'action';
      component.entityId = 10;
    });

    it('should match an activity that contains the action', () => {
      const activity = makeActivity({ actions: [makeAction(10)] });
      expect((component as any).activityMatchesEntity(activity)).toBeTrue();
    });

    it('should not match an activity whose actions do not include the entity', () => {
      const activity = makeActivity({ actions: [makeAction(99)] });
      expect((component as any).activityMatchesEntity(activity)).toBeFalse();
    });

    it('should not match an activity with no actions', () => {
      const activity = makeActivity({ actions: [] });
      expect((component as any).activityMatchesEntity(activity)).toBeFalse();
    });
  });

  // ─── tag ───────────────────────────────────────────────────────────────────

  describe('when entityType is tag', () => {
    beforeEach(() => {
      component.entityType = 'tag';
      component.entityId = 5;
    });

    it('should match when the tag is directly on the activity', () => {
      const activity = makeActivity({ tags: [makeTag(5)] });
      expect((component as any).activityMatchesEntity(activity)).toBeTrue();
    });

    it('should match when the tag is on one of the activity actions', () => {
      const activity = makeActivity({ actions: [makeAction(1, [makeTag(5)])] });
      expect((component as any).activityMatchesEntity(activity)).toBeTrue();
    });

    it('should not match when the tag is absent from both activity and its actions', () => {
      const activity = makeActivity({
        tags: [makeTag(99)],
        actions: [makeAction(1, [makeTag(99)])],
      });
      expect((component as any).activityMatchesEntity(activity)).toBeFalse();
    });
  });

  // ─── item ──────────────────────────────────────────────────────────────────

  describe('when entityType is item', () => {
    beforeEach(() => {
      component.entityType = 'item';
      component.entityId = 7;
    });

    it('should match when the item is on the activity', () => {
      const activity = makeActivity({ items: [makeItem(7)] });
      expect((component as any).activityMatchesEntity(activity)).toBeTrue();
    });

    it('should not match when the item is absent', () => {
      const activity = makeActivity({ items: [makeItem(99)] });
      expect((component as any).activityMatchesEntity(activity)).toBeFalse();
    });

    it('should not match an activity with no items', () => {
      const activity = makeActivity({ items: [] });
      expect((component as any).activityMatchesEntity(activity)).toBeFalse();
    });
  });
});
