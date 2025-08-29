import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { concatMap, from, map, Observable, toArray } from 'rxjs';
import { IActivity } from '../db';
import { ActivityService } from './activity.service';
import { addDays, format } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
    constructor(
        private http: HttpClient,
        private activityService: ActivityService,
    ) { }

    readMarkdownFiles() {
        const startDay = '2025-08-06';
        const endDay = '2025-08-24';
        const days = [];
        let day = startDay;

        while (day !== endDay) {
            days.push(day);
            day = format(addDays(new Date(day), 1), 'yyyy-MM-dd');
        }        

        return from(days).pipe(
            concatMap((day) => this.readMarkdownFile(day)),
            toArray(),
        );
    }

    readMarkdownFile(day: string) {
        const fileName = day + ' (J).md';
        const filePath = `assets/markdown/${fileName}`;
        return this.http.get(filePath, { responseType: 'text' })
            .pipe(
                map((content) => {
                    const lines = content.split('\n');
                    let capturing = false;
                    let result: string[] = [];

                    for (const line of lines) {
                        if (!capturing && line.includes('---- |')) {
                            capturing = true;
                            continue; // Skip the marker line itself
                        }
                        if (capturing) {
                            if (line.includes('#')) break;
                            result.push(line);
                        }
                    }

                    const activities = result
                        .map((line) => {
                            const columns = line.split(' | ');

                            if (columns.length < 7) {
                                return;
                            }

                            return {
                                date: day,
                                startTime: columns[0].replace('| ', '').trim(),
                                actions: columns[1].replaceAll(' \\|', ',').trim(),
                                mood: Number(columns[2].trim()),
                                energy: Number(columns[3].trim()),
                                satiety: Number(columns[4].trim()),
                                emotions: columns[5].trim(),
                                comment: columns[6].replace(' |', '').trim(),
                            };
                        })
                        .filter((activity) => activity);

                    return activities;
                })
            );
    }

}