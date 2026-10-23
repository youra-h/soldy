/**
 * Шаблон строки таблицы (`Table.Row`), как у Vue.
 *
 * Корень — сам `<tr is="so-table-row">`: классы (размер и вариант строке
 * диктует таблица), наборы (`data-selected` — его пишет выбор коллекции,
 * `data-disabled`, в сетке — `aria-selected`) и скрытие раскладывает на него
 * база (`ElementBase`). Нажатие по строке ловит плагин сетки таблицы: в
 * сетке оно выбирает строку, в роли `table` не делает ничего — выбирают
 * чекбоксом.
 *
 * - Ячейка колонки выбора — только пока выбор строк включён (`selecting`),
 *   первой в строке, как её заголовок в шапке: `td.so-table-row__select` с
 *   набором ячеек строки (`cellAria`) и чекбоксом строки — деталью CheckBox
 *   `<span is="so-check-box" embedded="table.select">` над экземпляром,
 *   который держит таблица (`adapters.table.checkBox` контекста строки).
 *   Отметку, «выключен», размер и вариант она пишет ему от выбора и строки, а
 *   клик по нему — просьба, которую она выполняет выбором строки: ни значения,
 *   ни обработчиков здесь нет, и отменённый выбор отметку не меняет. Чекбокс
 *   берётся только в этой ветке — геттер item-адаптера таблицы его создаёт, и
 *   у таблицы без выбора чекбоксов строк нет. Каждое подключение строки —
 *   новый контекст, и экземпляр от него приходит свой: другой экземпляр —
 *   новая ячейка, как ключ чекбокса у React. Имя — ссылка на заголовок строки
 *   (`aria_labelledBy` — `rowHeaderId`); заголовка нет — нет и ссылки.
 * - Ячейки колонок — по одной на ячейку строки (`cells`), петлёй по ключу
 *   колонки (`TKeyedLoop`): ячейки строки — новые записи на каждую смену, а
 *   узел ячейки живёт, пока жива её колонка, и с ним — фокус сетки. Ячейка
 *   колонки `rowHeader` — заголовок строки, `th scope="row"`, на её текст
 *   ссылается имя чекбокса строки; остальные — `td`. Тег входит в ключ:
 *   колонка, ставшая заголовком строки, получает новый узел. Класс один — тема
 *   различает ячейки тегом. Набор ячейки — `data-align` колонки, набор ячеек
 *   строки (`cellAria`: в сетке ячейка принимает фокус) и у заголовка строки
 *   его `id`.
 * - Содержимое ячейки — копия образца `cell` или значение текстом (`text`
 *   ячейки: тип поля записи таблица не знает, и текст считает ядро по
 *   правилу, общему для всех адаптеров, — `textContent` нарисовал бы объект
 *   как `[object Object]`). Образец — слот строки: копию образца `cell` таблицы
 *   строке кладёт таблица, и строка копирует его в каждую свою ячейку. Scope у
 *   слотов Web Components нет: строку копия находит у неё — `el.ctrl`
 *   ближайшего `<tr is="so-table-row">`; колонку — по месту ячейки, её номеру
 *   среди ячеек колонок строки (`so-table-row__cell`) в показанных колонках
 *   таблицы (`shownColumns`); значение — поле записи строки под ключом
 *   колонки (`column.field`). Копии ячеек строятся заново на каждую смену ячеек
 *   строки — записи, колонок, — а выбор их не трогает: его строка пишет на свой
 *   корень, и ни ячеек, ни копий «выбрать все» не перестраивает.
 */

import type {
	ICheckBox,
	ITableRow,
	TAriaAttributes,
	TTableCell,
	TTableRowCollectionFacade,
} from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	createDetail,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
} from '../../../adapter'
import { TCheckBoxElement, type TCheckBoxElementProps } from '../../check-box'

/** Контекст шаблона строки. */
type TRowContext = ITemplateContext<ITableRow, TTableRowCollectionFacade>

/** Ячейка колонки выбора и чекбокс строки в ней — над своим экземпляром. */
type TSelectCell = {
	readonly cell: HTMLTableCellElement
	readonly checkBox: TCheckBoxElementProps
	readonly ctrl: ICheckBox
}

/** Петля ячеек каждой строки — одна на всё время жизни элемента. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<TTableCell, string, HTMLTableCellElement>>()

/** Ячейка выбора каждой строки — пока выбор строк включён. */
const selects = new WeakMap<HTMLElement, TSelectCell>()

function isCheckBox(node: Element): node is TCheckBoxElementProps {
	return node instanceof TCheckBoxElement
}

/** Ключ ячейки — колонка и тег: колонка, ставшая заголовком строки, — новый узел. */
function keyOf(cell: TTableCell): string {
	return `${cell.column.uid}:${cell.rowHeader ? 'th' : 'td'}`
}

/** Узел ячейки колонки — заголовок строки или обычная. */
function cellOf(root: HTMLElement, cell: TTableCell): HTMLTableCellElement {
	const node = root.ownerDocument.createElement(cell.rowHeader ? 'th' : 'td')

	node.className = 'so-table-row__cell'

	if (cell.rowHeader) node.setAttribute('scope', 'row')

	return node
}

/** Содержимое ячейки: свежая копия образца `cell` или значение текстом. */
function fill(ctx: TRowContext, node: HTMLTableCellElement, cell: TTableCell): void {
	const copy = ctx.sample('cell')

	if (copy) {
		node.replaceChildren(copy)

		return
	}

	if (node.textContent !== cell.text) node.textContent = cell.text
}

/** Набор ячейки: `data-align` колонки, поверх — набор ячеек строки и `id` заголовка строки. */
function cellAttributes(node: HTMLTableCellElement, cell: TTableCell, aria?: TAriaAttributes) {
	ownerAttributes(node, { ...cell.dataset, ...aria, ...cell.aria })
}

/** Ячейка выбора — первой в строке, с чекбоксом строки над экземпляром таблицы. */
function selectOf(ctx: TRowContext, ctrl: ICheckBox): TSelectCell {
	const { ownerDocument } = ctx.root
	const cell = ownerDocument.createElement('td')
	const checkBox = createDetail(
		ownerDocument,
		'span',
		{ is: 'so-check-box', embedded: 'table.select' },
		isCheckBox,
	)

	cell.className = 'so-table-row__select'
	// Экземпляр и имя — до вставки: сборка чекбокса берёт их при подключении
	checkBox.ctrl = ctrl

	if (ctx.state.rowHeaderId !== undefined) checkBox.aria_labelledBy = ctx.state.rowHeaderId

	cell.appendChild(checkBox)

	return { cell, checkBox, ctrl }
}

export const tableRowTemplate: ITemplate<ITableRow, TTableRowCollectionFacade> = {
	create: (root) => {
		loops.set(root, new TKeyedLoop(root, null, keyOf))

		return {
			// Образец ячейки: копию кладёт таблица, строка копирует его в каждую ячейку
			slots: { cell: { mode: 'sample' } },
		}
	},

	bindings: [
		bind(['selecting', 'rowHeaderId', 'cellAria'], (ctx) => {
			const { root, state, facade } = ctx
			// Чекбокс — только в этой ветке: геттер item-адаптера таблицы его создаёт
			const ctrl =
				state.selecting === true ? facade?.context?.adapters.table.checkBox : undefined
			let select = selects.get(root)

			if (select && select.ctrl !== ctrl) {
				select.cell.remove()
				selects.delete(root)
				select = undefined
			}

			if (!ctrl) return

			if (!select) {
				select = selectOf(ctx, ctrl)
				selects.set(root, select)
				// Ячейки колонок — за ней
				root.prepend(select.cell)
			} else if (select.checkBox.aria_labelledBy !== state.rowHeaderId) {
				select.checkBox.aria_labelledBy = state.rowHeaderId
			}

			ownerAttributes(select.cell, state.cellAria)
		}),

		// Ячейки и их содержимое — на смену ячеек строки: записи, колонок
		bind('cells', (ctx) => {
			loops.get(ctx.root)?.draw(
				ctx.state.cells ?? [],
				(cell) => {
					const node = cellOf(ctx.root, cell)

					fill(ctx, node, cell)

					return node
				},
				(node, cell) => fill(ctx, node, cell),
			)
		}),

		// Наборы ячеек — и на смену набора ячеек строки, когда сами ячейки те же
		bind(['cells', 'cellAria'], ({ root, state }) => {
			const loop = loops.get(root)

			if (!loop) return

			for (const cell of state.cells ?? []) {
				const node = loop.elementOf(cell)

				if (node) cellAttributes(node, cell, state.cellAria)
			}
		}),
	],
}
