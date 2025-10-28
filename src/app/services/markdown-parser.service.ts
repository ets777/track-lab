import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ActivityService } from './activity.service';
import { InterpolationParameters, TranslateService } from '@ngx-translate/core';
import { appVersion } from '../../environments/version';
import { isDateValid } from '../functions/date';
import { ActivityForm } from '../components/activity-form/activity-form.component';
import { entitiesToString } from '../functions/string';
import { FileService } from './file.service';

const helperRevision1 = {
    parseLine: (date: string) => {
        return (line: string) => {
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
        }
    }
}

const helperRevision2 = {
    parseLine: (date: string) => {
        return (line: string) => {
            const columns = line.split(' | ');

            if (columns.length < 8) {
                return;
            }

            const tags = columns[6].replaceAll('#', '');
            const regex = /^[A-Za-zА-Яа-я0-9_-\s]+$/;

            if (tags && !regex.test(tags)) {
                throw new Error('TK_TAGS_CAN_ONLY_CONTAIN_LETTERS_DIGITS_HYPHENS_AND_UNDERSCORES');
            }

            return {
                date,
                startTime: columns[0].replace('| ', '').trim(),
                actions: columns[1].trim(),
                mood: Number(columns[2].trim()),
                energy: Number(columns[3].trim()),
                satiety: Number(columns[4].trim()),
                emotions: columns[5].trim(),
                tags: columns[6].replaceAll('#', '').replaceAll(' ', ', ').trim(),
                comment: columns[7].replace(' |', '').trim(),
            } as ActivityForm;
        }
    }
}

const versionMap = [
    { version: '0.4.0', helper: helperRevision2 },
    { version: '0.0.0', helper: helperRevision1 },
];

type MetaData = {
    date: string;
    version: string;
};

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
    constructor(
        private toastCtrl: ToastController,
        private activityService: ActivityService,
        private translate: TranslateService,
        private fileService: FileService,
    ) { }

    getMetaData(fileName: string, lines: string[]): MetaData {
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

        return {
            date,
            version,
        };
    }

    async parseMarkdownFile(fileName: string, content: string) {
        const lines = content.split('\n');
        const metaData = this.getMetaData(fileName, lines);
        const date = metaData.date;

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

        console.log(tableLines);

        const activities: ActivityForm[] = tableLines
            .map(this.getHelper(metaData.version).parseLine(date))
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

    getHelper(version: string) {
        if (!version) {
            return helperRevision1;
        }

        const [fileMajor, fileMinor, filePatch] = version.split('.').map(Number);

        const map = versionMap.find((map) => {
            const [mapMajor, mapMinor, mapPatch] = map.version.split('.').map(Number);

            return mapMajor < fileMajor
                || mapMajor == fileMajor && mapMinor < fileMinor
                || mapMajor == fileMajor && mapMinor == fileMinor && mapPatch <= filePatch;
        });

        return map?.helper ?? helperRevision1;
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
            'TK_TAGS',
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
                (activity) => `| ${activity.startTime} | ${entitiesToString(activity.actions)} | ${activity.mood} | ${activity.energy} | ${activity.satiety} | ${activity.emotions ?? ''} | ${entitiesToString(activity.tags.map((tag) => ({...tag, name: '#' + tag.name})), ' ') ?? ''} | ${activity.comment ?? ''} |`
            ).join('\n');

        const content = metaData + table;
        
        const [year, month] = date.split('-');
        const dirPath = `TrackLab/${year}/${month}`;
        const fileName = `${date}.md`;
        const mimeType = 'text/markdown';

        await this.fileService.saveFile(
            content,
            dirPath,
            fileName,
            mimeType,
        );
    }
}