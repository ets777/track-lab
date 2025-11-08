import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ActionFormComponent } from './action-form.component';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from 'src/app/services/db/sqlite.service';
import { DatabaseRouter } from 'src/app/services/db/database-router.service';

describe('ActionFormComponent', () => {
    let component: ActionFormComponent;
    let fixture: ComponentFixture<ActionFormComponent>;

    beforeEach(waitForAsync(async () => {
        TestBed.configureTestingModule({
            imports: [ActionFormComponent, IonicModule.forRoot(), TranslateModule.forRoot()],
            providers: [SQLiteService, DatabaseRouter],
        }).compileComponents();

        const adapter = TestBed.inject(DatabaseRouter);
        await adapter.setAdapter();
        
        fixture = TestBed.createComponent(ActionFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
