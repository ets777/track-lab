import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { MetricService } from '../services/metric.service';
import { IMetric } from '../db/models/metric';
import en from '../../assets/i18n/en.json';
import ru from '../../assets/i18n/ru.json';

const allTranslations: Record<string, string>[] = [
  en as Record<string, string>,
  ru as Record<string, string>,
];

export function reservedMetricNameValidator(
  metricService: MetricService,
  currentMetric?: IMetric,
): AsyncValidatorFn {
  return async (control: AbstractControl): Promise<ValidationErrors | null> => {
    const value = (control.value as string)?.trim();
    if (!value) return null;

    if (currentMetric?.isBase) return null;

    const baseMetrics = (await metricService.getAll()).filter((m) => m.isBase);

    for (const metric of baseMetrics) {
      for (const translations of allTranslations) {
        const translated = translations[metric.name];
        if (translated && translated.toLowerCase() === value.toLowerCase()) {
          return { reservedName: { message: 'TK_METRIC_NAME_IS_RESERVED' } };
        }
      }
    }

    return null;
  };
}
