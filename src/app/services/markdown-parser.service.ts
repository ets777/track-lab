import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { format } from 'date-fns';
import { IActivityDTO } from '../db';
import { ActivityService } from './activity.service';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { InterpolationParameters, TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
    constructor(
        private toastCtrl: ToastController,
        private activityService: ActivityService,
        private translate: TranslateService,
    ) { }

    async parseMarkdownFile(fileName: string, content: string) {
        const date = this.extractDateFromFileName(fileName);

        if (!date) {
            await this.showMessage('TK_FILE_NAME_MUST_CONTAIN_A_DATE_IN_FORMAT_YYYY_MM_DD');
            return;
        }

        const formattedDate = format(date, 'yyyy-MM-dd');

        const activitiesByDate = await this.activityService.getByDate(formattedDate);

        if (activitiesByDate?.length) {
            await this.showMessage(
                'TK_DATE_DATE_ALREADY_HAS_SOME_ACTIVITIES_IT_MUST_BE_EMPTY_BEFORE_IMPORTING',
                { date: formattedDate },
            );
            return;
        }

        const lines = content.split('\n');
        let capturing = false;
        let result: string[] = [];

        for (const line of lines) {
            if (!capturing && line.includes('---- |')) {
                capturing = true;
                continue; // Skip the marker line itself
            }
            if (capturing) {
                if (!line.includes('|')) break;
                result.push(line);
            }
        }

        if (!result.length) {
            await this.showMessage('TK_A_TABLE_WITH_DATA_WAS_NOT_FOUND');
            return;
        }

        const activities: IActivityDTO[] = result
            .map((line) => {
                const columns = line.split(' | ');

                if (columns.length < 7) {
                    return;
                }

                return {
                    date: formattedDate,
                    startTime: columns[0].replace('| ', '').trim(),
                    actions: columns[1].replaceAll(' \\|', ',').trim(),
                    mood: Number(columns[2].trim()),
                    energy: Number(columns[3].trim()),
                    satiety: Number(columns[4].trim()),
                    emotions: columns[5].trim(),
                    comment: columns[6].replace(' |', '').trim(),
                } as IActivityDTO;
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

    extractDateFromFileName(fileName: string): Date | null {
        const regex = /(\d{4})-(\d{2})-(\d{2})/;
        const match = fileName.match(regex);

        if (match) {
            const [_, year, month, day] = match;
            return new Date(Number(year), Number(month) - 1, Number(day));
        }

        return null;
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

    async addActivities(activities: IActivityDTO[]) {
        for (const activity of activities) {
            await this.activityService.add(activity);
        };
    }

    async exportMarkDownFile(date: string) {
        const activities = await this.activityService.getByDate(date);
        const translationKeys = [
            'TK_TIME',
            'TK_ACTIONS',
            'TK_MOOD',
            'TK_ENERGY',
            'TK_SATIETY',
            'TK_EMOTIONS',
            'TK_COMMENT',
        ];

        const titles = translationKeys.map((key) => this.translate.instant(key));
        const contentTitle = titles.join(' | ');
        const titleSeparator = titles
            .map((title) => title.replace(/(.)/g, '-'))
            .join(' | ');

        const content = `| ${contentTitle} |\n`
            + `| ${titleSeparator} |\n`
            + activities.map(
                (activity) => `| ${activity.startTime} | ${activity.actions} | ${activity.mood} | ${activity.energy} | ${activity.satiety} | ${activity.emotions} | ${activity.comment} |`
            ).join('\n');

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

            const a = await Filesystem.writeFile({
                path: fullPath,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
            });

            this.showMessage(`File saved in Documents/${fullPath}`);

            console.log(a);
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