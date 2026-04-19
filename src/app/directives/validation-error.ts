import { Directive, ElementRef, OnInit, Renderer2, inject } from "@angular/core";
import { AbstractControl, NgControl } from "@angular/forms";
import { TooltipService } from "../services/tooltip.service";
import { TranslateService } from "@ngx-translate/core";
import { Subscription } from "rxjs";

@Directive({
  selector: '[appValidationError]',
})
export class ValidationErrorDirective implements OnInit {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private controlDir = inject(NgControl);
  private tooltip = inject(TooltipService);
  private translate = inject(TranslateService);

  private subscription?: Subscription;
  private warningIcon?: HTMLElement;
  private warningIconParent?: HTMLElement;

  ngOnInit() {
    const control = this.controlDir.control;

    if (!control) {
      return;
    }

    this.updateWarning(control);

    this.subscription = control.statusChanges.subscribe(() => {
      this.updateWarning(control);
    });
  }

  private updateWarning(control: AbstractControl) {
    const tag = this.el.nativeElement.tagName.toLowerCase();
    const ionItem = this.el.nativeElement.closest('ion-item')
      || this.el.nativeElement.querySelector('ion-item')
      || this.el.nativeElement.children[0];
    const ionInput = ['ion-input', 'ion-textarea'].includes(tag)
      ? this.el.nativeElement
      : (this.el.nativeElement.querySelector('ion-textarea, ion-input') ?? this.el.nativeElement.children[0]?.children[0]);
    const iconTarget = tag === 'ion-select' ? this.el.nativeElement : ionInput;

    if (!ionItem || !iconTarget) {
      return;
    }

    if (control.invalid) {
      this.renderer.addClass(ionItem, 'invalid');
      this.addWarningIcon(iconTarget, control);
    } else {
      this.renderer.removeClass(ionItem, 'invalid');
      this.removeWarningIcon(iconTarget);
    }
  }

  private addWarningIcon(iconTarget: any, control: AbstractControl) {
    if (this.warningIcon) {
      return;
    }

    this.warningIcon = this.renderer.createElement('ion-icon');
    this.renderer.setAttribute(this.warningIcon, 'slot', 'end');
    this.renderer.setAttribute(this.warningIcon, 'src', 'assets/icon/warning-sign.svg');
    this.renderer.setAttribute(this.warningIcon, 'class', 'input-icon');
    this.renderer.setStyle(this.warningIcon, 'color', 'var(--ion-color-danger)');
    this.renderer.listen(this.warningIcon, 'click', (event: Event) => {
      event.preventDefault();
      this.tooltip.show(event, this.getErrorMessages(control));
    });
    this.warningIconParent = iconTarget;
    this.renderer.appendChild(iconTarget, this.warningIcon);
  }

  private removeWarningIcon(iconTarget: any) {
    if (!this.warningIcon) {
      return;
    }

    this.renderer.removeChild(this.warningIconParent ?? iconTarget, this.warningIcon);
    this.warningIcon = undefined;
    this.warningIconParent = undefined;
  }

  private getErrorMessages(control: AbstractControl) {
    const errors = control?.errors;
    const errorMessages = [];

    if (!errors) {
      return '';
    }

    const errorNames = Object.keys(errors);

    for (const errorName of errorNames) {
      if (errorName == 'required') {
        errorMessages.push(this.translate.instant('TK_VALUE_IS_REQUIRED'));
      }

      if (errorName == 'pattern') {
        errorMessages.push(this.translate.instant('TK_VALUE_MUST_BE_A_NUMBER'));
      }

      if (errorName == 'maxDateRange') {
        errorMessages.push(
          this.translate.instant(
            errors['maxDateRange'].message,
            errors['maxDateRange'].params,
          ),
        );
      }

      if (errors[errorName]?.message) {
        errorMessages.push(this.translate.instant(errors[errorName].message, errors[errorName].params));
      }
    }

    return errorMessages.map((message) => `- ${message}`).join('<br>') ?? '';
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
