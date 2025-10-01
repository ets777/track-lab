import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonPopover } from "@ionic/angular/standalone";
import { Subscription } from 'rxjs';
import { TooltipService } from 'src/app/services/tooltip.service';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  imports: [IonPopover, ],
})
export class TooltipComponent implements OnInit, OnDestroy {
  isOpen = false;
  event?: Event;
  message = '';

  private sub?: Subscription;

  constructor(private tooltip: TooltipService) { }

  ngOnInit() {
    this.sub = this.tooltip.state$.subscribe((state) => {
      if (state) {
        this.isOpen = true;
        this.event = state.event;
        this.message = state.message;
      } else {
        this.isOpen = false;
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onDismiss() {
    this.tooltip.hide();
  }
}
