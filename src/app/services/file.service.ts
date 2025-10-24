import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { InterpolationParameters, TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class FileService {
    constructor(
        private alertController: AlertController,
        private translate: TranslateService,
    ) {}

    async saveFile(
        content: string,
        dirPath: string,
        fileName: string,
        mimeType: string,
    ) {
        const fullPath = `${dirPath}/${fileName}`;

        if (Capacitor.isNativePlatform()) {
            await Filesystem.mkdir({
                path: dirPath,
                directory: Directory.Documents,
                recursive: true,
            }).catch(() => {
                // ignore if already exists
            });

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
            const blob = new Blob([content], { type: mimeType });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();

            URL.revokeObjectURL(url);
        }
    }

    async showMessage(message: string, params?: InterpolationParameters) {
        const alert = await this.alertController.create({
            header: this.translate.instant(message, params),
            buttons: [
                { text: this.translate.instant('TK_CLOSE'), role: 'close' },
            ],
        });

        await alert.present();
    }
}
