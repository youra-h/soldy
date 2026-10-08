import type { ITable, TTableCollection, TTableGridCell, TTableGridRow } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import type { IDomEventTarget } from '../../../utils'
import {
	closestControl,
	focusFirst,
	isFocusableElement,
	tabStops,
	tabStopsAfter,
	tabStopsBefore,
} from '../../../utils'
import { arrowStep, slideDirection } from '../../slide/direction'
import type { ITableGridPluginOptions, TTableGridHit, TTableGridPluginEvents } from './types'

/** На сколько строк ведут PageUp и PageDown — пока опция не задана. */
const PAGE_STEP = 10

/**
 * Ось строки сетки: колонки идут к её концу. По ней направление письма
 * сводится в сторону стрелок (`slideDirection`): в RTL → ведёт к началу.
 */
const AXIS = { orientation: 'horizontal', inverted: false } as const

/** Ребёнок узла с классом — только прямые дети: во вложенной таблице свои части. */
function childOf(node: Element | null, className: string): Element | null {
	if (!node) return null

	return Array.from(node.children).find((child) => child.classList.contains(className)) ?? null
}

/**
 * TTableGridPlugin — сетка таблицы в документе (APG Data Grid): клавиши,
 * выбор строки нажатием и DOM-фокус за фокусом сетки.
 *
 * Операции над DOM — здесь, фокус и выбор — у расширения `grid` коллекции
 * строк: плагин переводит клавиши и нажатия в его команды (`focusCell`,
 * `moveFocus`, `moveFocusToEdge`, `chooseRow`). Какая ячейка под фокусом,
 * решает расширение, а плагин ставит на неё DOM-фокус. Движок плагин узнаёт
 * от реестра bundles, узлы строк — от реестра узлов. Вне сетки плагин не
 * делает ничего.
 *
 * **Ячейки** плагин находит по строкам: шапка — строка шапки своей таблицы
 * (прямыми детьми, по классам владельца), строка тела — узел строки
 * коллекции. Ячейки строки идут по колонкам сетки: колонка выбора и
 * показанные колонки, — как их рисует таблица. Ячейки вложенной таблицы не
 * её: строк этой таблицы у них нет.
 *
 * **Остановка Tab — сама таблица.** Фокус, пришедший на корень, — Tab в
 * таблицу или нажатие мимо ячеек — плагин переводит на ячейку под фокусом
 * сетки. Пришедший с клавиатуры снаружи на виджет внутри ячейки (Shift+Tab
 * из-за таблицы) — тоже: у сетки одна остановка. Tab с ячейки уводит фокус
 * из таблицы — к остановке за ней или, с Shift, перед ней: внутри у ячеек
 * бывают свои поля и кнопки, и браузер повёл бы по ним.
 *
 * **Клавиши** — только с самой ячейки: ←/→ (по вычисленному направлению
 * письма), ↑/↓, Home/End — края строки, Ctrl+Home/End — края сетки,
 * PageUp/PageDown — на `pageStep` строк. Пробел (и Shift+пробел) на строке —
 * её выбор, на ячейке колонки выбора шапки — все показанные строки или
 * снять их; Ctrl/Cmd+A в `multiple` — выбрать все. Enter на заголовке
 * сортируемой колонки сортирует, на остальных ячейках, как и F2, уводит
 * фокус к первой остановке внутри ячейки. Там клавиши принадлежат виджетам,
 * а сетке — только Escape и F2 (обратно на ячейку) и Tab (по кругу остановок
 * ячейки). Ctrl+Shift+←/→ — перестановка колонки, её ведёт свой плагин.
 *
 * **Нажатие** по строке — где угодно, кроме контролов внутри ячейки, —
 * выбор строки, как у строки ListBox. Фокус на ячейку ставит сам браузер
 * (`tabindex="-1"`), а плагин сообщает его сетке (`focusin`).
 */
export class TTableGridPlugin extends TBasePlugin<ITable, TTableGridPluginEvents> {
	private _owner: ITable | null = null
	private _root: Element | null = null
	private _engine: TTableCollection | null = null
	private _elements: TCollectionElements | null = null
	private _pageStep = PAGE_STEP
	/** Фокус придёт от нажатия указателя, а не с клавиатуры. */
	private _pointer = false
	private _frame: number | null = null

	override install(ctx: IPluginContext, options?: ITableGridPluginOptions): void {
		super.install(ctx, options)

		this._pageStep = options?.pageStep ?? this._pageStep
		this._owner = ctx.getInstance<ITable>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки. Движок
		// живёт дольше монтирования, поэтому подписка через базу: её снимет
		// `destroy()`
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
			this._listenTo(engine.extensions.grid.events, 'change:focusedCell', this._follow)
		})
	}

	override destroy(): void {
		this._detach()
		this._owner = null
		this._engine = null
		this._elements = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._detach()

		this._root = root

		const target: IDomEventTarget = root

		target.addEventListener('focusin', this._onFocusIn)
		target.addEventListener('keydown', this._onKeyDown)
		target.addEventListener('pointerdown', this._onPointerDown)
		target.addEventListener('click', this._onClick)
	}

	private _detach(): void {
		this._cancelFrame()

		const target: IDomEventTarget | null = this._root

		target?.removeEventListener('focusin', this._onFocusIn)
		target?.removeEventListener('keydown', this._onKeyDown)
		target?.removeEventListener('pointerdown', this._onPointerDown)
		target?.removeEventListener('click', this._onClick)

		this._root = null
	}

	/** Расширение сетки, пока таблица в сетке. */
	private get _grid() {
		const grid = this._engine?.extensions.grid

		return grid?.grid ? grid : null
	}

	/* ------------------------------------------------------------------ */
	/* Ячейки в документе                                                 */
	/* ------------------------------------------------------------------ */

	private _headRow(): Element | null {
		const owner = this._owner

		if (!owner || !this._root) return null

		return childOf(
			childOf(this._root, owner.classes.resolve('__head')),
			owner.classes.resolve('__head-row'),
		)
	}

	private _body(): Element | null {
		const owner = this._owner

		return owner && this._root ? childOf(this._root, owner.classes.resolve('__body')) : null
	}

	/** Строка сетки, чей узел — `line`; чужой узел — `undefined`. */
	private _rowOf(line: Element): TTableGridRow | undefined {
		if (line === this._headRow()) return 'head'
		if (!this._body() || line.parentElement !== this._body()) return undefined

		return this._engine?.extensions.batch.shown.find(
			(row) => this._elements?.getElementByItem(row) === line,
		)
	}

	/** Узел строки сетки — пока он в теле своей таблицы. */
	private _lineOf(row: TTableGridRow): Element | null {
		if (row === 'head') return this._headRow()

		const line = this._elements?.getElementByItem(row) ?? null

		return line && line.parentElement === this._body() ? line : null
	}

	/**
	 * Ячейка сетки, в которой лежит цель, — её строка, колонка и узел. Ячейки
	 * строки идут по колонкам сетки; строка ещё не дорисовала смену колонок —
	 * ячейки нет: место в строке не совпало бы с колонкой.
	 */
	private _cellOf(target: EventTarget | null): TTableGridHit | undefined {
		const grid = this._grid
		const root = this._root

		if (!grid || !root || !(target instanceof Element) || !root.contains(target))
			return undefined

		const columns = grid.gridColumns

		for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
			const line = node.parentElement
			const row = line ? this._rowOf(line) : undefined

			if (!line || row === undefined) continue
			if (line.children.length !== columns.length) return undefined

			return { row, column: columns[Array.from(line.children).indexOf(node)], element: node }
		}

		return undefined
	}

	/** Узел ячейки сетки — пока её строка дорисована по колонкам сетки. */
	private _cellElement(cell: TTableGridCell): Element | null {
		const grid = this._grid
		const line = this._lineOf(cell.row)

		if (!grid || !line) return null

		const columns = grid.gridColumns

		if (line.children.length !== columns.length) return null

		return line.children[columns.indexOf(cell.column)] ?? null
	}

	/* ------------------------------------------------------------------ */
	/* Фокус                                                              */
	/* ------------------------------------------------------------------ */

	/**
	 * Фокус сетки перешёл — DOM-фокус за ним, если он в сетке: на корне или на
	 * ячейке. Фокус на виджете внутри ячейки плагин не трогает: там с
	 * клавишами работает виджет. Вне таблицы фокус сетка помнит до Tab в неё.
	 */
	private readonly _follow = (cell: TTableGridCell | undefined): void => {
		const root = this._root
		const active = root?.ownerDocument.activeElement

		if (!root || !cell || !active || !root.contains(active)) return
		if (active !== root && this._cellOf(active)?.element !== active) return

		this._focus(cell)
	}

	/**
	 * DOM-фокус — на узел ячейки. Узла ещё нет — строку перерисовывают после
	 * смены, которая её показала, — ждём кадр.
	 */
	private _focus(cell: TTableGridCell): void {
		this._cancelFrame()

		if (this._focusNow(cell)) return

		this._frame = requestAnimationFrame(() => {
			this._frame = null
			this._focusNow(cell)
		})
	}

	private _focusNow(cell: TTableGridCell): boolean {
		const element = this._cellElement(cell)

		if (!isFocusableElement(element)) return false
		if (element.ownerDocument.activeElement !== element) element.focus()

		return true
	}

	private _cancelFrame(): void {
		if (this._frame === null) return

		cancelAnimationFrame(this._frame)
		this._frame = null
	}

	private readonly _onPointerDown = (): void => {
		this._pointer = true
	}

	private readonly _onFocusIn = (event: FocusEvent): void => {
		const pointer = this._pointer
		const grid = this._grid
		const root = this._root
		const target = event.target

		this._pointer = false

		if (!grid || !root) return

		// Tab в таблицу или нажатие мимо ячеек — на ячейку под фокусом сетки
		if (target === root) {
			if (grid.focusedCell) this._focus(grid.focusedCell)

			return
		}

		const hit = this._cellOf(target)

		if (!hit) return

		const related = event.relatedTarget
		const fromOutside = !(related instanceof Node && root.contains(related))

		// С клавиатуры снаружи на виджет внутри ячейки — у сетки одна остановка
		if (target !== hit.element && fromOutside && !pointer) {
			if (grid.focusedCell) this._focus(grid.focusedCell)

			return
		}

		grid.focusCell(hit.row, hit.column)
	}

	/* ------------------------------------------------------------------ */
	/* Клавиши                                                            */
	/* ------------------------------------------------------------------ */

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		this._pointer = false

		if (event.defaultPrevented) return

		const hit = this._cellOf(event.target)

		if (!hit) return

		if (event.target === hit.element) this._navigate(event, hit)
		else this._interact(event, hit)
	}

	/** Клавиша с самой ячейки — ходьба по сетке, выбор и вход в ячейку. */
	private _navigate(event: KeyboardEvent, hit: TTableGridHit): void {
		const action = this._actionOf(event, hit)

		if (!action) return

		event.preventDefault()
		action()
	}

	/** Что клавиша на ячейке делает; не наша клавиша — `null`. */
	private _actionOf(event: KeyboardEvent, hit: TTableGridHit): (() => void) | null {
		const grid = this._grid
		const root = this._root
		const engine = this._engine

		if (!grid || !root || !engine || event.altKey) return null

		const command = event.ctrlKey || event.metaKey

		if (event.key === 'Tab' && !command) return () => this._leave(event.shiftKey)

		// По `code`: на русской раскладке `key` — «ф»
		if (command && !event.shiftKey && event.code === 'KeyA') {
			if (engine.extensions.selection.mode !== 'multiple') return null

			return () => engine.extensions.table.selectShown()
		}

		if (command) {
			// Ctrl+Shift+←/→ — перестановка колонки, Meta — чужие жесты
			if (event.shiftKey || event.metaKey) return null

			if (event.key === 'Home') return () => grid.moveFocusToEdge('start', 'grid')
			if (event.key === 'End') return () => grid.moveFocusToEdge('end', 'grid')

			return null
		}

		switch (event.key) {
			case ' ':
				return () => this._choose(hit)
			case 'Enter':
				return () => this._activate(hit)
			case 'F2':
				return () => this._enter(hit.element)
		}

		// Shift со стрелками — выбор диапазона, его у сетки нет
		if (event.shiftKey) return null

		switch (event.key) {
			case 'ArrowUp':
				return () => grid.moveFocus(-1, 0)
			case 'ArrowDown':
				return () => grid.moveFocus(1, 0)
			case 'Home':
				return () => grid.moveFocusToEdge('start', 'row')
			case 'End':
				return () => grid.moveFocusToEdge('end', 'row')
			case 'PageUp':
				return () => grid.moveFocus(-this._pageStep, 0)
			case 'PageDown':
				return () => grid.moveFocus(this._pageStep, 0)
		}

		const step = event.key.startsWith('Arrow')
			? arrowStep(slideDirection(AXIS, root), event.key)
			: null

		return step === null ? null : () => grid.moveFocus(0, step)
	}

	/**
	 * Пробел: на строке — её выбор, на ячейке колонки выбора шапки — все
	 * показанные строки или снять их, как её чекбокс. Остальным ячейкам шапки
	 * пробел ничего не делает, но страницу не листает.
	 */
	private _choose(hit: TTableGridHit): void {
		const engine = this._engine

		if (!engine) return

		if (hit.row !== 'head') {
			engine.extensions.grid.chooseRow(hit.row)

			return
		}

		if (hit.column !== 'select' || engine.extensions.selection.mode !== 'multiple') return

		const { table } = engine.extensions

		if (table.shownSelection === 'all') table.deselectShown()
		else table.selectShown()
	}

	/** Enter: заголовок сортируемой колонки сортирует, остальные ячейки — вход в ячейку. */
	private _activate(hit: TTableGridHit): void {
		const column = hit.column

		if (hit.row === 'head' && column !== 'select' && column.sortable) {
			this._engine?.extensions.sort.toggle(column.field)

			return
		}

		this._enter(hit.element)
	}

	/** Фокус — к первой остановке внутри ячейки: дальше клавиши принадлежат её виджетам. */
	private _enter(cell: Element): void {
		focusFirst(tabStops(cell))
	}

	/**
	 * Tab с ячейки — из таблицы: к остановке за ней, с Shift — перед ней.
	 * Остановки нет — фокус снимается, и следующий Tab начнёт с края
	 * документа: внутри таблицы браузер повёл бы по полям ячеек.
	 */
	private _leave(backward: boolean): void {
		const root = this._root

		if (!root) return

		const stops = backward ? tabStopsBefore(root).reverse() : tabStopsAfter(root, null)

		if (focusFirst(stops)) return

		const active = root.ownerDocument.activeElement

		if (isFocusableElement(active)) active.blur()
	}

	/**
	 * Клавиша с виджета внутри ячейки. Escape и F2 возвращают фокус на ячейку,
	 * Tab ходит по кругу остановок ячейки: из сетки уводит Tab только с самой
	 * ячейки. Остальное — виджета.
	 */
	private _interact(event: KeyboardEvent, hit: TTableGridHit): void {
		if (event.altKey || event.ctrlKey || event.metaKey) return

		if (event.key === 'Escape' || event.key === 'F2') {
			if (!isFocusableElement(hit.element)) return

			event.preventDefault()
			hit.element.focus()

			return
		}

		if (event.key !== 'Tab') return

		const target = event.target
		const stops = tabStops(hit.element)
		const at = target instanceof Node ? stops.findIndex((stop) => stop.contains(target)) : -1

		event.preventDefault()

		if (stops.length === 0) return

		const next = (at + (event.shiftKey ? -1 : 1) + stops.length) % stops.length

		focusFirst([stops[next]])
	}

	/* ------------------------------------------------------------------ */
	/* Нажатие                                                            */
	/* ------------------------------------------------------------------ */

	/**
	 * Нажатие по строке — её выбор, как у строки ListBox. Контролы внутри
	 * ячейки — чекбокс строки, кнопки и поля слота — нажимаются сами.
	 */
	private readonly _onClick = (event: MouseEvent): void => {
		if (event.defaultPrevented) return

		const hit = this._cellOf(event.target)

		if (!hit || hit.row === 'head' || !(event.target instanceof Element)) return
		if (closestControl(event.target, hit.element)) return

		this._engine?.extensions.grid.chooseRow(hit.row)
	}
}
