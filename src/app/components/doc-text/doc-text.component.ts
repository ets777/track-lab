import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { parseDocInline } from 'src/app/functions/doc-inline';
import { DocInlineSegment } from 'src/app/types/doc-inline-segment';

/**
 * Renders a run of manual text, turning inline markdown links into tappable
 * links: internal `[text](./slug.md)` navigates within the manual, external
 * `[text](https://…)` / `mailto:` open outside. Plain text renders as-is.
 */
@Component({
  selector: 'app-doc-text',
  templateUrl: './doc-text.component.html',
  styleUrls: ['./doc-text.component.scss'],
})
export class DocTextComponent {
  private router = inject(Router);

  @Input({ required: true })
  set text(value: string) {
    this.segments = parseDocInline(value ?? '');
  }

  segments: DocInlineSegment[] = [];

  open(slug: string) {
    this.router.navigate(['/docs', slug]);
  }

  openRoute(route: string) {
    this.router.navigateByUrl(route);
  }
}
