import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { format } from 'date-fns';
import { IActivityDTO } from '../db';
import { ActivityService } from './activity.service';

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
    constructor(
        private toastCtrl: ToastController,
        private activityService: ActivityService,
    ) { }

    async parseMarkdownFile(fileName: string, content: string) {
        const date = this.extractDateFromFileName(fileName);

        if (!date) {
            await this.showMessage('File name must contain a date in format yyyy-mm-dd');
            return;
        }

        const formattedDate = format(date, 'yyyy-MM-dd');

        const activitiesByDate = await this.activityService.getByDate(formattedDate);

        if (activitiesByDate?.length) {
            await this.showMessage(`Date ${formattedDate} already has some activities. It must be empty before importing.`);
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
            await this.showMessage('File name must contain a date in format yyyy-mm-dd');
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
                await this.showMessage('An error occurred while importing the file.');
            }
            await this.showMessage('File imported successfully.');
        } else {
            await this.showMessage('There\'s nothing to import.');
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

    async showMessage(message: string) {
        const toast = await this.toastCtrl.create({
            message,
            duration: 8000,
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
}