import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ActionFormComponent } from './action-form.component';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';
import { DatabaseRouter } from 'src/app/services/db/database-router.service';
import { provideRouter } from '@angular/router';
import { SQLiteInitService } from 'src/app/services/db/sqlite-init.service';
import { InitializeAppService } from 'src/app/services/initialize-app.service';
import { TagService } from 'src/app/services/tag.service';

describe('ActionFormComponent', () => {
    let component: ActionFormComponent;
    let fixture: ComponentFixture<ActionFormComponent>;

    beforeEach(waitForAsync(async () => {
        TestBed.configureTestingModule({
            imports: [ActionFormComponent, IonicModule.forRoot(), TranslateModule.forRoot()],
            providers: [
                provideRouter([]),
                { provide: SQLiteService, useValue: {} },
                { provide: DatabaseRouter, useValue: {} },
                { provide: SQLiteInitService, useValue: {} },
                {
                    provide: InitializeAppService,
                    useValue: { initializeApp: async () => Promise.resolve() },
                },
                {
                    provide: TagService,
                    useValue: { getAllUnhidden: async () => [] },
                },
            ],
        }).compileComponents();
        
        fixture = TestBed.createComponent(ActionFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
