import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { helpCircleOutline } from 'ionicons/icons';

/**
 * Toolbar trailing help control. Renders a question-mark button that opens the
 * matching documentation article at `/docs/<slug>`. Place in `slot="end"`.
 */
@Component({
  selector: 'app-help-button',
  templateUrl: './help-button.component.html',
  styleUrls: ['./help-button.component.scss'],
  imports: [IonButton, IonIcon],
})
export class HelpButtonComponent {
  private router = inject(Router);

  /** Documentation article slug, e.g. 'rules', 'experiments', 'library'. */
  @Input({ required: true }) slug!: string;

  constructor() {
    addIcons({ helpCircleOutline });
  }

  open(): void {
    this.router.navigate(['/docs', this.slug]);
  }
}
