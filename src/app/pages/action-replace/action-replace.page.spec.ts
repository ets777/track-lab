import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionReplacePage } from './action-replace.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';

describe('ActionReplacePage', () => {
    let component: ActionReplacePage;
    let fixture: ComponentFixture<ActionReplacePage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), ActionReplacePage],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(ActionReplacePage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
