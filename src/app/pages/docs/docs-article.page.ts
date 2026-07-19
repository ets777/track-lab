import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavButtonComponent } from 'src/app/components/nav-button/nav-button.component';
import { DocTextComponent } from 'src/app/components/doc-text/doc-text.component';
import { DocArticle, DocBlock, Loc, findArticle, pickLoc } from './docs-content';

/** Renders one manual article, walking its blocks into native components. */
@Component({
  selector: 'app-docs-article',
  templateUrl: './docs-article.page.html',
  styleUrls: ['./docs-article.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, TranslateModule, NavButtonComponent, DocTextComponent],
})
export class DocsArticlePage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);

  /** Re-read on language change so a switch in Settings updates open articles. */
  readonly lang = signal(this.translate.currentLang);
  article: DocArticle | undefined;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.article = findArticle(slug);
    if (!this.article) {
      this.router.navigate(['/docs']);
      return;
    }
    this.translate.onLangChange.subscribe(e => this.lang.set(e.lang));
  }

  pick(loc: Loc): string {
    return pickLoc(loc, this.lang());
  }

  open(slug: string) {
    this.router.navigate(['/docs', slug]);
  }

  // Narrowing helpers for the template.
  asItems(block: DocBlock): Loc[] {
    return (block as Extract<DocBlock, { items: Loc[] }>).items;
  }
  asHeaders(block: DocBlock): Loc[] {
    return (block as Extract<DocBlock, { t: 'table' }>).headers;
  }
  asRows(block: DocBlock): Loc[][] {
    return (block as Extract<DocBlock, { t: 'table' }>).rows;
  }
}
