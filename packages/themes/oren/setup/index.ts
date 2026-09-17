/**
 * Поведение темы oren: плагины, которые пишут данные для её CSS.
 *
 * Подключается в точке входа приложения рядом со стилями:
 *
 *   import '@soldy/theme-oren'
 *   import oren from '@soldy/theme-oren/setup'
 *
 *   useTheme(oren)
 *
 * Без этого вызова стили на месте, но то, что CSS читает из переменных
 * плагинов, не рисуется: полоса под активным табом.
 */

import { TTabs } from '@soldy/core'
import { defineTheme } from '@soldy/setup'
import { TTabsViewPlugin } from './tabs-view.plugin'

export { TTabsViewPlugin }

export default defineTheme({
	name: 'oren',
	plugins: [
		// Полоса и разрыв линии под активным табом (`--underline-*`, `--gap-*`)
		{ type: TTabs, plugins: [TTabsViewPlugin] },
	],
})
