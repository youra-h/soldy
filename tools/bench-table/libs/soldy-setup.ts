/**
 * Настройка soldy и флаги участника — общие для страниц Vue (`soldy.ts`) и
 * React (`react/soldy.tsx`): одна тема, одни колонки и пропсы таблицы.
 */
import type { TTableColumnFit } from '@soldy-ui/core'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { useMotion } from '@soldy-ui/plugins'
import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import { COLUMNS } from './data'

useIcons(material)
useTheme(oren)
const query = new URLSearchParams(location.search)
// `?motion=reduce` — без движения (`useMotion('reduce')`): соседи взятого
// заголовка стоят, место — линия. Без флага — режим системы
if (query.get('motion') === 'reduce') useMotion('reduce')
// `?reorder=1` — колонки таблицы можно переставлять (`reorderable`): для
// сценариев перестановки. Без флага проп не задан — колонки стоят
const reorder = query.get('reorder') === '1' ? { reorderable: true } : {}
// `?preview=column` — за жестом перестановки идут и ячейки строк
// (`reorderPreview: 'column'`), `?preview=none` — шапка стоит
// (`reorderPreview: 'none'`). Без флага проп не задан
const previewFlag = query.get('preview')
const preview =
	previewFlag === 'column' || previewFlag === 'none' ? { reorderPreview: previewFlag } : {}
// `?resize=1` — у колонок таблицы ручка ширины (`resizable`): для сценариев
// протяжки; `?resize=deferred` — и отложенная протяжка (`resizePreview: 'deferred'`).
// Без флага проп не задан — ручек нет
const resizeFlag = query.get('resize')
const resize = resizeFlag === '1' || resizeFlag === 'deferred' ? { resizable: true } : {}
const resizePreview = resizeFlag === 'deferred' ? { resizePreview: 'deferred' as const } : {}
// `?fit=<значение>` — `columnFit` таблицы, любое значение `TTableColumnFit`:
// `contain` — гибкие колонки ровно заполняют место, таблица не шире места, и
// окно не прокручивается вбок; `none` — колонки шириной по умолчанию, место они
// не делят; `auto` — как без флага. Без флага проп не задан (`auto`): колонки
// растут от 160 px, и 20 колонок шире окна стенда
const FITS: readonly TTableColumnFit[] = ['none', 'auto', 'contain']
const fitFlag = FITS.find((fit) => fit === query.get('fit'))
const columnFit = fitFlag ? { columnFit: fitFlag } : {}
export const columns = COLUMNS.map((c) => ({ ...c, sortable: true }))
export const sel = {
	selectAll: 'thead .so-table__select input',
	sort: 'thead .so-table-column__sort',
	// Заголовки колонок данных — их берут сценарии перестановки
	columns: 'thead .so-table-column',
	// Полосы ручек ширины — их тянут сценарии протяжки
	resizers: 'thead .so-table-column__resizer',
}
// `?mode=none` — таблица без выбора: строка без чекбокса, для сравнения памяти
export const mode = query.get('mode') === 'none' ? 'none' : 'multiple'
// `?virtual=1` — окно: таблица в обёртке `Virtual` в контейнере высотой 800 px,
// тело рисует только видимые строки
export const virtual = query.get('virtual') === '1'
// `?width=3248` — таблица в обёртке такой ширины, px: место таблицы шире окна
// стенда. 3248 — сумма 20 колонок по 160 px и колонки выбора: колонки влезают,
// и окно таблицы вбок не прокручивается — в любом `columnFit`
export const width = Number(query.get('width')) || undefined
// `?track=1` — состав сверяется по ключу записи (`trackBy`): замена данных
// обновляет строки, а не пересобирает их. Без флага ключа нет — замена это
// очистка и новый состав
const trackBy =
	query.get('track') === '1'
		? { trackBy: (item: { data?: Record<string, unknown> }) => item.data?.id }
		: {}
/**
 * Пропсы таблицы из флагов — кроме колонок и строк. Не заданный флагом проп не
 * задан и у таблицы: страницы раскладывают пропсы спредом, а шаблон Angular
 * привязывает их по именам, и вход со значением `undefined` адаптер не пишет.
 */
export type TTableProps = {
	mode: 'none' | 'multiple'
	aria_label: string
	reorderable?: boolean
	reorderPreview?: 'column' | 'none'
	resizable?: boolean
	resizePreview?: 'deferred'
	columnFit?: TTableColumnFit
	trackBy?: (item: { data?: Record<string, unknown> }) => unknown
}
export const tableProps: TTableProps = {
	mode,
	aria_label: 'Бенч',
	...reorder,
	...preview,
	...resize,
	...resizePreview,
	...columnFit,
	...trackBy,
}
