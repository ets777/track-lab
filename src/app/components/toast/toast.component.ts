import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IToast, ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  imports: [TranslateModule],
})
export class ToastComponent implements OnInit {
  title = '';
  icon = '';
  visible = false;

  constructor(private toastService: ToastService) { }

  ngOnInit() {
    this.toastService.onEvent().subscribe(
      (toast) => {
        this.show(toast);
      }
    );
  }

  show(toast: IToast) {
    this.title = toast.title;
    if (toast.icon) {
      this.icon = toast.icon;
    } else if (toast.type) {
      switch (toast.type) {
        case 'success':
          this.icon = '✅';
          break;
        case 'error':
          this.icon = '❌';
          break;
        case 'warning':
          this.icon = '⚠️';
          break;
        case 'info':
          this.icon = 'ℹ️';
          break;
        case 'waiting':
          this.icon = '⏳';
          break;
      }
    }
    this.visible = true;
    setTimeout(
      () => this.visible = false,
      toast.duration ?? this.toastService.getDefaultDuration(),
    );
  }

}
