/**
 * Поведение общего слоя тем: плагины раскладки — данные, которые нужны частям
 * в любой теме, а CSS посчитать их не может.
 *
 * - `TTabsViewPlugin` — место и длина активного таба на ряду Tabs: по ним
 *   тема рисует отметку активного таба;
 * - `TTableHeadPlugin` — высота закреплённой шапки Table: по ней CSS общего
 *   слоя держит фокус в теле ниже шапки;
 * - `TToastsFrontPlugin` — высота переднего тоста стопки Toasts: по ней CSS
 *   общего слоя ставит высоту задних, а тема ведёт её переходом.
 *
 * Своего `defineTheme` у общего слоя нет: приложение подключает одну тему, и
 * плагины общего слоя ставит она — в своём объекте `defineTheme`:
 *
 *   import { TTable, TTabs, TToasts } from '@soldy-ui/core'
 *   import { defineTheme } from '@soldy-ui/setup'
 *   import { TTableHeadPlugin, TTabsViewPlugin, TToastsFrontPlugin } from '@soldy-ui/theme-base/setup'
 *
 *   export default defineTheme({
 *     name: 'my-theme',
 *     plugins: [
 *       { type: TTabs, plugins: [TTabsViewPlugin] },
 *       { type: TTable, plugins: [TTableHeadPlugin] },
 *       { type: TToasts, plugins: [TToastsFrontPlugin] },
 *     ],
 *   })
 *
 * Без плагина CSS остаётся рабочим: переменной нет, и часть стоит по запасному
 * значению (`packages/themes/base/AGENTS.md`, «Плагины раскладки: `setup/`»).
 */

export { TTableHeadPlugin, TTabsViewPlugin, TToastsFrontPlugin } from './plugins'
