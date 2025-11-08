import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { defineCustomElements as pwaElements } from '@ionic/pwa-elements/loader';
import { SQLiteService } from './app/services/db/sqlite.service';
import { SQLiteInitService } from './app/services/db/sqlite-init.service';
import { Capacitor } from '@capacitor/core';
import { DatabaseRouter } from './app/services/db/database-router.service';

const platform = Capacitor.getPlatform();
if (platform === 'web') {
    pwaElements(window);
    jeepSqlite(window);

    window.addEventListener('DOMContentLoaded', () => {
        const jeepEl = document.createElement("jeep-sqlite");
        document.body.appendChild(jeepEl);
        customElements.whenDefined('jeep-sqlite');
        jeepEl.autoSave = true;
    });
}

bootstrapApplication(AppComponent, {
    providers: [
        SQLiteService,
        SQLiteInitService,
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideIonicAngular(),
        provideRouter(routes, withPreloading(PreloadAllModules)),
        importProvidersFrom(IonicModule.forRoot()),
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideIonicAngular(),
        provideRouter(routes, withPreloading(PreloadAllModules)),
        provideHttpClient(withInterceptorsFromDi()),
        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: 'assets/i18n/',
                suffix: '.json',
            }),
            fallbackLang: 'en',
        }),
        provideCharts(withDefaultRegisterables()),
        provideAppInitializer(async () => {
            const databaseRouter = inject(DatabaseRouter);
            const sqlite = inject(SQLiteService);
            
            await databaseRouter.setAdapter();
            const isPluginInitialized = await sqlite.initializePlugin();

            if (!isPluginInitialized) {
                return;
            }

            if (sqlite.platform === 'web') {
                await sqlite.initWebStore();
            }

            return sqlite.openDatabase();
        }),
    ],
});
