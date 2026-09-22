/**
 * Поведение темы oren: плагины и расширения коллекций, данные которых читает
 * её CSS.
 *
 * Подключается в точке входа приложения рядом со стилями:
 *
 *   import '@soldy-ui/theme-oren'
 *   import oren from '@soldy-ui/theme-oren/setup'
 *
 *   useTheme(oren)
 *
 * Без этого вызова стили на месте, но то, что CSS читает из переменных
 * плагинов, не рисуется: полоса под активным табом.
 *
 * Раскладка — по виду регистрации: `plugins/` — плагины и их установщик
 * (`install.ts`). Расширения коллекций встанут рядом тем же порядком:
 * `extensions/` со своим установщиком, подключённым здесь.
 */

import { defineTheme } from '@soldy-ui/setup'
import { plugins } from './plugins'

export { TTabsViewPlugin } from './plugins'

export default defineTheme({
	name: 'oren',
	plugins,
})
