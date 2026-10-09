/**
 * Установщик плагинов темы: какие плагины на какие компоненты ставит oren.
 *
 * Список, а не вызовы `usePlugins`: регистрирует его `useTheme` вместе с
 * расширениями коллекций, и отменяется тема тоже целиком.
 */

import { TTable, TTabs } from '@soldy-ui/core'
import type { IThemePlugins } from '@soldy-ui/setup'
import { TTableHeadPlugin } from './table-head.plugin'
import { TTabsViewPlugin } from './tabs-view.plugin'

export const plugins: readonly IThemePlugins[] = [
	// Геометрия активного таба (`--active-tab-*`, `--gap-*`) и признак её
	// переезда: полоса `line`, карточка `contained`, разрыв линии `outline`
	{ type: TTabs, plugins: [TTabsViewPlugin] },
	// Высота закреплённой шапки (`--s-table-head-height`): фокус в теле
	// встаёт ниже шапки
	{ type: TTable, plugins: [TTableHeadPlugin] },
]
