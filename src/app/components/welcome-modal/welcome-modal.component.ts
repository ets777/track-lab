import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonModal, IonCheckbox } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from 'src/app/services/app-config.service';
import { LogService } from 'src/app/services/log.service';

/**
 * First-launch welcome. Shows once until the user opts out; the opt-out lives
 * in the appConfig table (so it travels with backups). Hosted globally in
 * app.component so it is not tied to any single page.
 */
@Component({
  selector: 'app-welcome-modal',
  templateUrl: './welcome-modal.component.html',
  styleUrls: ['./welcome-modal.component.scss'],
  imports: [IonModal, IonCheckbox, CommonModule, FormsModule, TranslateModule],
})
export class WelcomeModalComponent implements OnInit {
  private appConfigService = inject(AppConfigService);
  private router = inject(Router);
  private logService = inject(LogService);

  @ViewChild(IonModal) private modal!: IonModal;

  /** Set once the user opts out, so the welcome never returns. */
  static readonly DISMISSED_KEY = 'welcome.dismissed';

  /** Where support mail is sent. */
  readonly contactEmail = 'tracklab@etsbox.com';

  /** Checked by default: a plain dismiss then means "never again". */
  dontShowAgain = true;

  async ngOnInit() {
    try {
      const dismissed = await this.appConfigService.get(WelcomeModalComponent.DISMISSED_KEY);
      if (dismissed === 'true') {
        return;
      }
      // Present imperatively rather than via [isOpen]: the binding can fire
      // before the ion-modal web component finishes hydrating and then silently
      // no-ops. By the time this async read resolves the view has initialized,
      // so the ViewChild modal is available; the setTimeout guards hydration.
      setTimeout(() => this.modal.present(), 0);
    } catch (e) {
      this.logService.error('WelcomeModalComponent.ngOnInit', e);
    }
  }

  /** Close the welcome, then open a manual article (or the index when no slug). */
  async openDoc(slug?: string) {
    await this.modal.dismiss();
    this.router.navigate(slug ? ['/docs', slug] : ['/docs']);
  }

  /** "Got it" button. */
  close() {
    return this.modal.dismiss();
  }

  /** Fires after any dismissal; persists the opt-out so the welcome never returns. */
  async onDidDismiss() {
    if (!this.dontShowAgain) {
      return;
    }
    try {
      await this.appConfigService.set(WelcomeModalComponent.DISMISSED_KEY, 'true');
    } catch (e) {
      this.logService.error('WelcomeModalComponent.onDidDismiss', e);
    }
  }
}
