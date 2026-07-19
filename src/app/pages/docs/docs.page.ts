import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { DOC_ARTICLES, DocArticle, pickLoc } from './docs-content';

/** Index of the in-app user manual: one tappable row per article. */
@Component({
  selector: 'app-docs',
  templateUrl: './docs.page.html',
  styleUrls: ['./docs.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, CommonModule, TranslateModule, NavButtonComponent],
})
export class DocsPage {
  private router = inject(Router);
  private translate = inject(TranslateService);

  readonly articles = DOC_ARTICLES;

  pick(article: DocArticle, field: 'title' | 'summary'): string {
    return pickLoc(article[field], this.translate.currentLang);
  }

  open(slug: string) {
    this.router.navigate(['/docs', slug]);
  }
}
