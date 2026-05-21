import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ExperimentService, FinishedExperiment } from 'src/app/services/experiment.service';

@Component({
  selector: 'app-experiment-notification',
  templateUrl: './experiment-notification.component.html',
  styleUrls: ['./experiment-notification.component.scss'],
  imports: [CommonModule, TranslateModule],
})
export class ExperimentNotificationComponent implements OnInit {
  private experimentService = inject(ExperimentService);
  private router = inject(Router);

  visible = false;
  current: FinishedExperiment | null = null;

  private queue: FinishedExperiment[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.experimentService.finishedExperiments$.subscribe(list => {
      this.queue.push(...list);
      if (!this.visible) this.showNext();
    });
  }

  private showNext() {
    if (this.queue.length === 0) return;
    this.current = this.queue.shift()!;
    this.visible = true;
    this.timer = setTimeout(() => this.dismiss(), 10000);
  }

  dismiss() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.visible = false;
    setTimeout(() => this.showNext(), 400);
  }

  navigate() {
    if (!this.current) return;
    this.router.navigate(['/experiment', this.current.id]);
    this.dismiss();
  }
}
