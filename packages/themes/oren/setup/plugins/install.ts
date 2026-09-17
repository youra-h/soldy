/**
 * Установщик плагинов темы: какие плагины на какие компоненты ставит oren.
 *
 * Список, а не вызовы `usePlugins`: регистрирует его `useTheme` вместе с
 * расширениями коллекций, и отменяется тема тоже целиком.
 */

import { TTabs } from '@soldy/core'
import type { IThemePlugins } from '@soldy/setup'
import { TTabsViewPlugin } from './tabs-view.plugin'

export const plugins: readonly IThemePlugins[] = [
	// Полоса и разрыв линии под активным табом (`--underline-*`, `--gap-*`)
	{ type: TTabs, plugins: [TTabsViewPlugin] },
]
