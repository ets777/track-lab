import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionEditPage } from './action-edit.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';

describe('ActionEditPage', () => {
    let component: ActionEditPage;
    let fixture: ComponentFixture<ActionEditPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ActionEditPage, TranslateModule.forRoot()],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(ActionEditPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
