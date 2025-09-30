import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagViewPage } from './tag-view.page';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';

describe('TagViewPage', () => {
  let component: TagViewPage;
  let fixture: ComponentFixture<TagViewPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagViewPage, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(TagViewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
