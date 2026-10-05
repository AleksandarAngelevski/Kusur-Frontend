import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

// main.ts registers this for the app; specs don't run main.ts, and the number pipes format with 'de-DE'
registerLocaleData(localeDe);
