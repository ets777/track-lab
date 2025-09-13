import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ActivityService } from './activity.service';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { InterpolationParameters, TranslateService } from '@ngx-translate/core';
import { appVersion } from '../../environments/version';
import { isDateValid } from '../functions/date';
import { ActivityForm } from '../components/activity-form/activity-form.component';
import { actionsToString } from '../functions/action';

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
    constructor(
        private toastCtrl: ToastController,
        private activityService: ActivityService,
        private translate: TranslateService,
    ) { }

    async parseMarkdownFile(fileName: string, content: string) {
        const lines = content.split('\n');
        let date = this.extractDateFromFileName(fileName);
        let capturingMetaData = false;
        let version = '';

        // looking for meta data
        for (const line of lines) {
            // start of meta data
            if (!capturingMetaData && line.includes('---') && !line.includes('|')) {
                capturingMetaData = true;
                continue;
            }
            // content of meta data
            if (capturingMetaData && line.includes(':')) {
                const lineParts = line.split(':');

                if (['Date', 'Дата'].includes(lineParts[0])) {
                    date = lineParts[1].trim();
                }
                if (['Version', 'Версия'].includes(lineParts[0])) {
                    version = lineParts[1].trim();
                }
            }
            // end of meta data
            if (capturingMetaData && line.includes('---') && !line.includes('|')) {
                break;
            }
        }

        if (!date || !isDateValid(date)) {
            await this.showMessage('TK_FILE_MUST_CONTAIN_META_DATA_WITH_A_DATE_IN_FORMAT_YYYY_MM_DD');
            return;
        }

        const activitiesByDate = await this.activityService.getByDate(date);

        if (activitiesByDate?.length) {
            await this.showMessage(
                'TK_DATE_DATE_ALREADY_HAS_SOME_ACTIVITIES_IT_MUST_BE_EMPTY_BEFORE_IMPORTING',
                { date },
            );
            return;
        }

        let capturingTable = false;
        let tableLines: string[] = [];

        for (const line of lines) {
            // start of table
            if (!capturingTable && line.includes('--- |')) {
                capturingTable = true;
                continue;
            }
            // content of table
            if (capturingTable && line.includes('|')) {
                tableLines.push(line);
            }
            // end of table
            if (capturingTable && !line.includes('|')) {
                break;
            }
        }

        if (!tableLines.length) {
            await this.showMessage('TK_A_TABLE_WITH_DATA_WAS_NOT_FOUND');
            return;
        }

        const activities: ActivityForm[] = tableLines
            .map((line) => {
                const columns = line.split(' | ');

                if (columns.length < 7) {
                    return;
                }

                return {
                    date,
                    startTime: columns[0].replace('| ', '').trim(),
                    actions: columns[1].replaceAll(' \\|', ',').trim(),
                    mood: Number(columns[2].trim()),
                    energy: Number(columns[3].trim()),
                    satiety: Number(columns[4].trim()),
                    emotions: columns[5].trim(),
                    comment: columns[6].replace(' |', '').trim(),
                } as ActivityForm;
            })
            .filter((activity) => typeof activity !== 'undefined');

        if (activities) {
            try {
                await this.addActivities(activities);
            } catch (e) {
                await this.showMessage('TK_AN_ERROR_OCCURRED_WHILE_IMPORTING_THE_FILE');
            }
            await this.showMessage('TK_FILE_IMPORTED_SUCCESSFULLY');
        } else {
            await this.showMessage('TK_THERE_S_NOTHING_TO_IMPORT');
        }

        return activities;
    }

    extractDateFromFileName(fileName: string): string {
        const regex = /(\d{4})-(\d{2})-(\d{2})/;
        const match = fileName.match(regex);

        if (match) {
            const [_, year, month, day] = match;
            return `${year}-${month}-${day}`;
        }

        return '';
    }

    async showMessage(message: string, params?: InterpolationParameters) {
        const toast = await this.toastCtrl.create({
            message: this.translate.instant(message, params),
            duration: 7000,
            position: 'bottom',
            cssClass: 'tall-toast',
        });
        await toast.present();
    }

    async addActivities(activities: ActivityForm[]) {
        for (const activity of activities) {
            await this.activityService.addFromForm(activity);
        };
    }

    async exportMarkDownFile(date: string) {
        const metaData = `---\n`
            + `${this.translate.instant('TK_DATE')}: ${date}\n`
            + `${this.translate.instant('TK_VERSION')}: ${appVersion}\n`
            + `---\n\n`;
        const activities = await this.activityService.getByDate(date);
        const tableTitleTranslationKeys = [
            'TK_TIME',
            'TK_ACTIONS',
            'TK_MOOD',
            'TK_ENERGY',
            'TK_SATIETY',
            'TK_EMOTIONS',
            'TK_COMMENT',
        ];

        const tableTitles = tableTitleTranslationKeys.map((key) => this.translate.instant(key));
        const tableContentTitle = tableTitles.join(' | ');
        const tableTitleSeparator = tableTitles
            .map((title) => title.replace(/(.)/g, '-'))
            .join(' | ');

        const table = `| ${tableContentTitle} |\n`
            + `| ${tableTitleSeparator} |\n`
            + activities.map(
                (activity) => `| ${activity.startTime} | ${actionsToString(activity.actions)} | ${activity.mood} | ${activity.energy} | ${activity.satiety} | ${activity.emotions ?? ''} | ${activity.comment ?? ''} |`
            ).join('\n');

        const content = metaData + table;

        if (Capacitor.isNativePlatform()) {
            const [year, month] = date.split('-');
            const dirPath = `TrackLab/${year}/${month}`;

            await Filesystem.mkdir({
                path: dirPath,
                directory: Directory.Documents,
                recursive: true,
            }).catch(() => {
                // ignore if already exists
            });

            const fullPath = `${dirPath}/${date}.md`;

            await Filesystem.writeFile({
                path: fullPath,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
            });

            await this.showMessage(
                'TK_FILE_SAVED_IN_PATH', 
                { path: 'Documents/' + fullPath },
            );
        } else {
            const blob = new Blob([content], { type: 'text/markdown' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = date + '.md';
            a.click();

            URL.revokeObjectURL(url);
        }
    }
}