import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TagInputComponent } from './tag-input.component';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { SQLiteService } from 'src/app/services/db/sqlite.service';
import { DatabaseRouter } from 'src/app/services/db/database-router.service';
import { InitializeAppService } from 'src/app/services/initialize-app.service';
import { SQLiteInitService } from 'src/app/services/db/sqlite-init.service';
import { TagService } from 'src/app/services/tag.service';

describe('TagInputComponent', () => {
    let component: TagInputComponent;
    let fixture: ComponentFixture<TagInputComponent>;

    beforeEach(waitForAsync(async () => {
        await TestBed.configureTestingModule({
            imports: [TagInputComponent, TranslateModule.forRoot()],
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

        fixture = TestBed.createComponent(TagInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
