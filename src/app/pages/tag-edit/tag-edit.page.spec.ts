import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagEditPage } from './tag-edit.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';

describe('TagEditPage', () => {
    let component: TagEditPage;
    let fixture: ComponentFixture<TagEditPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TagEditPage, TranslateModule.forRoot()],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(TagEditPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
