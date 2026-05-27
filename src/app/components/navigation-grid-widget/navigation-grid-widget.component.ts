import { Component, Input } from '@angular/core';
import { LinkWidgetComponent } from 'src/app/components/link-widget/link-widget.component';
import { NavigationWidgetConfig } from 'src/app/types/dashboard-widget';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-navigation-grid-widget',
  templateUrl: './navigation-grid-widget.component.html',
  styleUrl: './navigation-grid-widget.component.scss',
  imports: [LinkWidgetComponent, TranslateModule],
})
export class NavigationGridWidgetComponent {
  @Input() config!: NavigationWidgetConfig;
}
