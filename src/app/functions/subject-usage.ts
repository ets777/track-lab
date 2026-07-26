import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BlockingUsage, SubjectUsage } from '../types/subject-usage';

/** Message fragment naming what a still-referenced entity is used by. */
const USAGE_KEYS: Record<SubjectUsage, string> = {
  rule: 'TK_USAGE_RULE',
  experiment: 'TK_USAGE_EXPERIMENT',
  widget: 'TK_USAGE_WIDGET',
};

/**
 * Base entities store their name as a translation key, user-created ones store
 * plain text — `instant` returns the latter unchanged, so both are safe to run
 * through it.
 */
function name(translate: TranslateService, value: string): string {
  return translate.instant(value);
}

async function present(
  alertController: AlertController,
  translate: TranslateService,
  header: string,
): Promise<void> {
  const alert = await alertController.create({
    header,
    buttons: [
      { text: translate.instant('TK_CLOSE'), role: 'close' },
    ],
  });

  await alert.present();
}

/** "<list> cannot be deleted because its item <name> is used in <usage>". */
export function presentListInUseAlert(
  alertController: AlertController,
  translate: TranslateService,
  listName: string,
  blocking: BlockingUsage,
): Promise<void> {
  return present(
    alertController,
    translate,
    translate.instant('TK_LIST_CANNOT_BE_DELETED_IN_USE', {
      list: name(translate, listName),
      name: name(translate, blocking.name),
      usage: translate.instant(USAGE_KEYS[blocking.usage]),
    }),
  );
}

/** "<name> cannot be deleted because it is used in <usage>". */
export function presentItemInUseAlert(
  alertController: AlertController,
  translate: TranslateService,
  blocking: BlockingUsage,
): Promise<void> {
  return present(
    alertController,
    translate,
    translate.instant('TK_ITEM_CANNOT_BE_DELETED_IN_USE', {
      name: name(translate, blocking.name),
      usage: translate.instant(USAGE_KEYS[blocking.usage]),
    }),
  );
}
