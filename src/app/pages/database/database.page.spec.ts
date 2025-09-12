import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatabasePage } from './database.page';
import { TranslateModule } from '@ngx-translate/core';

describe('DatabasePage', () => {
  let component: DatabasePage;
  let fixture: ComponentFixture<DatabasePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), DatabasePage],
    }).compileComponents();

    fixture = TestBed.createComponent(DatabasePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
