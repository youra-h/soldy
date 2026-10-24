/**
 * Установщик плагинов темы: какие плагины на какие компоненты ставит oren.
 *
 * Список, а не вызовы `usePlugins`: регистрирует его `useTheme` вместе с
 * расширениями коллекций, и отменяется тема тоже целиком.
 *
 * Все три плагина — раскладки, из общего слоя тем
 * (`@soldy-ui/theme-base/setup`): данные, которые они пишут, нужны частям в
 * любой теме, а ставит их тема — своего `useTheme` у общего слоя нет.
 * Плагин, данные которого нужны только облику oren, встал бы сюда же, файлом
 * рядом.
 */

import { TTable, TTabs, TToasts } from '@soldy-ui/core'
import type { IThemePlugins } from '@soldy-ui/setup'
import { TTableHeadPlugin, TTabsViewPlugin, TToastsFrontPlugin } from '@soldy-ui/theme-base/setup'

export const plugins: readonly IThemePlugins[] = [
	// Геометрия активного таба (`--so-tabs-active-*`, `--so-tabs-gap-*`) и признак её
	// переезда: полоса `line`, карточка `contained`, разрыв линии `outline`
	{ type: TTabs, plugins: [TTabsViewPlugin] },
	// Высота закреплённой шапки (`--so-table-head-height`): фокус в теле
	// встаёт ниже шапки
	{ type: TTable, plugins: [TTableHeadPlugin] },
	// Высота переднего тоста стопки (`--so-toasts-front-height`): задние меняют
	// её переходом, когда передний сменился
	{ type: TToasts, plugins: [TToastsFrontPlugin] },
]
