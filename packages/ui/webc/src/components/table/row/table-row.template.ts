/**
 * Шаблон строки таблицы: ячейка выбора с чекбоксом, пока выбор включён, и
 * ячейки колонок петлёй по ключу — узел живёт, пока жива колонка, и с ним
 * фокус сетки. Нажатие по строке ловит плагин сетки таблицы.
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
	patch,
} from '../../../adapter'
import { TCheckBoxElement, type TCheckBoxElementProps } from '../../check-box'

type TRowContext = ITemplateContext<ITableRow, TTableRowCollectionFacade>

type TSelectCell = {
	readonly cell: HTMLTableCellElement
	readonly checkBox: TCheckBoxElementProps
	readonly ctrl: ICheckBox
}

const loops = new WeakMap<HTMLElement, TKeyedLoop<TTableCell, string, HTMLTableCellElement>>()

const selects = new WeakMap<HTMLElement, TSelectCell>()

/** Ключ ячейки — колонка и тег: колонка, ставшая заголовком строки, — новый узел. */
function keyOf(cell: TTableCell): string {
	return `${cell.column.uid}:${cell.rowHeader ? 'th' : 'td'}`
}

/** Класс один: тема различает ячейки тегом. */
function cellOf(root: HTMLElement, cell: TTableCell): HTMLTableCellElement {
	const node = root.ownerDocument.createElement(cell.rowHeader ? 'th' : 'td')

	node.className = 'so-table-row__cell'

	if (cell.rowHeader) node.setAttribute('scope', 'row')

	return node
}

/** Без образца — `text` ядра: `textContent` нарисовал бы объект как `[object Object]`. */
function fill(ctx: TRowContext, node: HTMLTableCellElement, cell: TTableCell): void {
	const copy = ctx.sample('cell')

	if (copy) {
		node.replaceChildren(copy)

		return
	}

	patch(node, { textContent: cell.text })
}

function cellAttributes(node: HTMLTableCellElement, cell: TTableCell, aria?: TAriaAttributes) {
	ownerAttributes(node, { ...cell.dataset, ...aria, ...cell.aria })
}

/** Отметку и клик чекбокса ведёт таблица: ни значения, ни обработчиков здесь нет. */
function selectOf(ctx: TRowContext, ctrl: ICheckBox): TSelectCell {
	const { ownerDocument } = ctx.root
	const cell = ownerDocument.createElement('td')
	const checkBox = createDetail(ownerDocument, TCheckBoxElement, { embedded: 'table.select' })

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
			slots: { cell: { mode: 'sample' } },
		}
	},

	bindings: [
		bind(['selecting', 'rowHeaderId', 'cellAria'], (ctx) => {
			const { root, state, facade } = ctx
			// Только в этой ветке: геттер item-адаптера таблицы чекбокс создаёт
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
				root.prepend(select.cell)
			} else if (select.checkBox.aria_labelledBy !== state.rowHeaderId) {
				select.checkBox.aria_labelledBy = state.rowHeaderId
			}

			ownerAttributes(select.cell, state.cellAria)
		}),

		// Копии образца — на смену ячеек строки; выбор их не перестраивает
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
