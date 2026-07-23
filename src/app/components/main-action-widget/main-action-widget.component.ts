import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-main-action-widget',
  templateUrl: './main-action-widget.component.html',
  styleUrl: './main-action-widget.component.scss',
  imports: [TranslateModule],
})
export class MainActionWidgetComponent {
  @Input() label = '';
  @Input() sublabel = '';
  @Input() route = '';
  @Input() color?: string;

  private router = inject(Router);

  navigate() {
    this.router.navigate([this.route]);
  }
}
