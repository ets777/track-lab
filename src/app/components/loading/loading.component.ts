import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss'],
  imports: [IonSpinner, TranslateModule],
})
export class LoadingComponent implements OnInit {
  private loadingService = inject(LoadingService);
  private cdr = inject(ChangeDetectorRef);

  state = { visible: false, message: '' };

  ngOnInit() {
    this.loadingService.getState().subscribe(s => {
      this.state = s;
      this.cdr.detectChanges();
    });
  }
}
