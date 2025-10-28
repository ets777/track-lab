import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BackButtonComponent } from './back-button.component';
import { TranslateModule } from '@ngx-translate/core';

describe('BackButtonComponent', () => {
    let component: BackButtonComponent;
    let fixture: ComponentFixture<BackButtonComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [BackButtonComponent, IonicModule.forRoot(), TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(BackButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
