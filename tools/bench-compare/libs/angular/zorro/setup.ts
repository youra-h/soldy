// The styles come only under the `style` condition, and an import from a
// script does not take them — by file, as at the table stand
import '../../../node_modules/ng-zorro-antd/ng-zorro-antd.min.css'
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time'
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n'

/**
 * NG-ZORRO as the application sets it up: the prebuilt styles and the locale
 * provider, and the date adapter the date picker needs (native, from the
 * docs). The library's default locale is Chinese; English is the one the
 * soldy pages take (`enUS` of the locale provider).
 */
export const providers = [provideNzI18n(en_US), provideNzNativeDateAdapter()]
