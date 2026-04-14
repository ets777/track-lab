import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { format } from 'date-fns';

const LOG_DIR = 'TrackLab/logs';

@Injectable({ providedIn: 'root' })
export class LogService {
  async error(context: string, error: unknown): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const message = error instanceof Error
      ? `${error.message}\n${error.stack ?? ''}`
      : String(error);
    const entry = `[${timestamp}] [${context}] ${message}\n`;
    const fileName = `${format(new Date(), 'yyyy-MM-dd')}.log`;

    await Filesystem.mkdir({
      path: LOG_DIR,
      directory: Directory.Documents,
      recursive: true,
    }).catch(() => {
      // ignore if already exists
    });

    let existing = '';
    await Filesystem.readFile({
      path: `${LOG_DIR}/${fileName}`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    }).then(result => {
      existing = result.data as string;
    }).catch(() => {
      // file doesn't exist yet
    });

    await Filesystem.writeFile({
      path: `${LOG_DIR}/${fileName}`,
      data: existing + entry,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  }
}
