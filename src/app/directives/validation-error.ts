import { Directive, ElementRef, Input, Renderer2 } from "@angular/core";
import { AbstractControl, NgControl } from "@angular/forms";
import { TooltipService } from "../services/tooltip.service";
import { TranslateService } from "@ngx-translate/core";
import { Subscription } from "rxjs";

@Directive({
    selector: '[validationError]',
})
export class ValidationErrorDirective {
    private subscription?: Subscription;
    private warningIcon?: HTMLElement;

    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
        private controlDir: NgControl,
        private tooltip: TooltipService,
        private translate: TranslateService,
    ) { }

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
        const ionItem = this.el.nativeElement.closest('ion-item');
        if (!ionItem) {
            return;
        }

        if (control.invalid) {
            this.renderer.addClass(ionItem, 'invalid');
            this.addWarningIcon(control);
        } else {
            this.renderer.removeClass(ionItem, 'invalid');
            this.removeWarningIcon(control);
        }
    }

    private addWarningIcon(control: AbstractControl) {
        if (this.warningIcon) {
            return;
        }

        this.warningIcon = this.renderer.createElement('ion-icon');
        this.renderer.setAttribute(this.warningIcon, 'slot', 'end');
        this.renderer.setAttribute(this.warningIcon, 'src', 'assets/icon/warning-sign.svg');
        this.renderer.setAttribute(this.warningIcon, 'class', 'input-icon');
        this.renderer.listen(this.warningIcon, 'click', (event: Event) => {
            this.tooltip.show(event, this.getErrorMessages(control));
        });
        this.renderer.appendChild(this.el.nativeElement, this.warningIcon);
    }

    private removeWarningIcon(control: AbstractControl) {
        if (!this.warningIcon) {
            return;
        }

        this.renderer.removeChild(this.el.nativeElement, this.warningIcon);
        this.warningIcon = undefined;
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

            if (errorName == 'maxDateRange') {
                errorMessages.push(
                    this.translate.instant(
                        errors['maxDateRange'].message,
                        errors['maxDateRange'].params,
                    ),
                );
            }

            if (errors[errorName].message) {
                errorMessages.push(this.translate.instant(errors[errorName].message));
            }
        }

        return errorMessages.map((message) => `- ${message}`).join('<br>') ?? '';
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}
