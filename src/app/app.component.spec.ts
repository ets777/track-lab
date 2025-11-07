import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { SQLiteService } from './services/db/sqlite.service';
import { SQLiteInitService } from './services/db/sqlite-init.service';

describe('AppComponent', () => {
  it('should create the app', async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), AppComponent],
      providers: [provideRouter([]), SQLiteService, SQLiteInitService],
    }).compileComponents();
    
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
