import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TagInputComponent } from './tag-input.component';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { SQLiteService } from 'src/app/services/db/sqlite.service';
import { DatabaseRouter } from 'src/app/services/db/database-router.service';

describe('TagInputComponent', () => {
    let component: TagInputComponent;
    let fixture: ComponentFixture<TagInputComponent>;

    beforeEach(waitForAsync(async () => {
        await TestBed.configureTestingModule({
            imports: [TagInputComponent, TranslateModule.forRoot()],
            providers: [provideRouter([]), SQLiteService, DatabaseRouter],
        }).compileComponents();

        const adapter = TestBed.inject(DatabaseRouter);
        await adapter.setAdapter();

        fixture = TestBed.createComponent(TagInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
