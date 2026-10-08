import type { ITable, ITableColumn, TTableCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import type { IDomEventTarget } from '../../../utils'
import { isFocusableElement, isMeasurableElement } from '../../../utils'
import { arrowStep, slideDirection } from '../../slide/direction'
import type { TTableColumnReorderPluginEvents, TTableColumnReorderPress } from './types'

/**
 * Переменная сдвига взятого заголовка — контракт с темой. Значение — px по
 * оси окна от места нажатия: тема кладёт её в `translate` заголовка, и он идёт
 * за указателем, а колонка под ним стоит на месте. Без жеста переменной нет.
 */
const DRAG_VARIABLE = '--s-table-column-drag'

/**
 * Сколько пройти от точки нажатия, чтобы нажатие стало жестом, px: меньше —
 * это нажатие кнопки сортировки, а не перестановка. Порог тот же, что у жеста
 * слоя (`TSwipePlugin`).
 */
const START_DISTANCE = 6

/**
 * Ось шапки: колонки идут вдоль строки, к её концу. По ней направление письма
 * сводится в сторону, куда колонка уходит дальше от начала (`slideDirection`),
 * как у ручки ширины.
 */
const AXIS = { orientation: 'horizontal', inverted: false } as const

/** Ребёнок узла с классом — только прямые дети: во вложенной таблице свои шапки. */
function childOf(node: Element, className: string): Element | null {
	return Array.from(node.children).find((child) => child.classList.contains(className)) ?? null
}

/**
 * TTableColumnReorderPlugin — перестановка колонок пользователем: заголовок
 * тащат указателем или сдвигают Ctrl+Shift+←/→.
 *
 * Операции над DOM — здесь, место колонки — у расширения `columns` коллекции
 * строк: плагин переводит указатель и клавиши в его команды (`dragStart`,
 * `dragOver`, `dragEnd`, `dragCancel`, `moveColumn`). Какую колонку можно
 * взять, куда она встанет и что сообщить приложению, решает расширение.
 * Движок плагин узнаёт от реестра bundles (`engine:bound`).
 *
 * **Заголовки** плагин находит в шапке своей таблицы — прямыми детьми, по
 * классам владельца и колонки: заголовков таблица рисует по одному на
 * показанную колонку и в её порядке, поэтому место заголовка в строке шапки —
 * место колонки среди показанных. Колонку выбора и шапки вложенных таблиц
 * поиск не видит.
 *
 * **Указатель** — на корне: нажатие на заголовке колонки, которую можно
 * взять, становится жестом, когда указатель ушёл по строке дальше порога, —
 * до этого оно остаётся нажатием, и кнопка сортировки сортирует. Нажатие,
 * которое уже взяли (ручка ширины гасит своё), не наше. Жест захватывает
 * указатель на корне: протяжка за таблицей и отпускание где угодно приходят
 * сюда, а `click` отпускания до кнопки сортировки не доходит. Взятый заголовок
 * идёт за указателем — переменная сдвига на нём, — а колонка под ним и строки
 * стоят на месте: место, куда колонка встанет, плагин считает по серединам
 * остальных заголовков и сообщает расширению. Отпускание — перестановка,
 * отнятый указатель и Escape — отмена.
 *
 * **Клавиши** — Ctrl+Shift+←/→ на заголовке под фокусом (на кнопке
 * сортировки и поле ручки, а в Grid — на самой ячейке): шаг к началу или к
 * концу строки по вычисленному направлению письма, в RTL ← — к концу.
 * Таблица перерисовывает шапку, и узел под фокусом браузер при переносе мог
 * потерять — плагин возвращает ему фокус кадром позже.
 */
export class TTableColumnReorderPlugin extends TBasePlugin<
	ITable,
	TTableColumnReorderPluginEvents
> {
	private _owner: ITable | null = null
	private _root: Element | null = null
	private _engine: TTableCollection | null = null
	private _press: TTableColumnReorderPress | null = null
	private _frame: number | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITable>() ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
		})
	}

	override destroy(): void {
		this._detach()
		this._owner = null
		this._engine = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._detach()

		this._root = root

		const target: IDomEventTarget = root

		target.addEventListener('pointerdown', this._onPointerDown)
		target.addEventListener('pointermove', this._onPointerMove)
		target.addEventListener('pointerup', this._onPointerUp)
		target.addEventListener('pointercancel', this._onPointerCancel)
		target.addEventListener('lostpointercapture', this._onPointerCancel)
		target.addEventListener('keydown', this._onKeyDown)
	}

	private _detach(): void {
		this._end(false)
		this._cancelFrame()

		const target: IDomEventTarget | null = this._root

		target?.removeEventListener('pointerdown', this._onPointerDown)
		target?.removeEventListener('pointermove', this._onPointerMove)
		target?.removeEventListener('pointerup', this._onPointerUp)
		target?.removeEventListener('pointercancel', this._onPointerCancel)
		target?.removeEventListener('lostpointercapture', this._onPointerCancel)
		target?.removeEventListener('keydown', this._onKeyDown)

		this._root = null
	}

	/* ------------------------------------------------------------------ */
	/* Заголовки                                                          */
	/* ------------------------------------------------------------------ */

	/** Показанные колонки — по ним разложены заголовки шапки. */
	private get _shown(): ReadonlyArray<ITableColumn> {
		return this._engine?.extensions.columns.shownColumns ?? []
	}

	/**
	 * Заголовки шапки своей таблицы — по одному на показанную колонку, в её
	 * порядке. Шапка ещё не дорисовала смену колонок — заголовков нет: место
	 * в строке не совпало бы с местом колонки.
	 */
	private _headers(): Element[] {
		const root = this._root
		const owner = this._owner
		const shown = this._shown
		const base = shown[0]?.classes.base

		if (!root || !owner || !base) return []

		const head = childOf(root, owner.classes.resolve('__head'))
		const row = head && childOf(head, owner.classes.resolve('__head-row'))
		const cells = row
			? Array.from(row.children).filter((cell) => cell.classList.contains(base))
			: []

		return cells.length === shown.length ? cells : []
	}

	/** Заголовок, в котором лежит цель события, и его колонка. */
	private _hit(target: EventTarget | null): { column: ITableColumn; cell: Element } | undefined {
		if (!(target instanceof Node)) return undefined

		const headers = this._headers()
		const index = headers.findIndex((cell) => cell.contains(target))

		return index === -1 ? undefined : { column: this._shown[index], cell: headers[index] }
	}

	/**
	 * Место среди показанных, куда встанет взятая колонка, — сколько остальных
	 * заголовков серединой стоят раньше указателя по строке. Свой заголовок не в
	 * счёт: он идёт за указателем.
	 */
	private _placeAt(x: number, root: Element, own: Element): number {
		const ltr = slideDirection(AXIS, root) === 'from-left'

		return this._headers().filter((cell) => {
			if (cell === own) return false

			const box = cell.getBoundingClientRect()
			const middle = box.left + box.width / 2

			return ltr ? x > middle : x < middle
		}).length
	}

	/* ------------------------------------------------------------------ */
	/* Указатель                                                          */
	/* ------------------------------------------------------------------ */

	private readonly _onPointerDown = (event: PointerEvent): void => {
		// Основная кнопка; жест уже идёт; нажатие уже взяли — ручка ширины гасит своё
		if (this._press || event.button !== 0 || event.defaultPrevented) return

		const hit = this._hit(event.target)

		if (!hit || !hit.column.reorderable || hit.column.disabled) return

		this._press = {
			pointer: event.pointerId,
			origin: event.clientX,
			column: hit.column,
			cell: hit.cell,
			dragging: false,
		}
	}

	private readonly _onPointerMove = (event: PointerEvent): void => {
		const press = this._press
		const root = this._root
		const columns = this._engine?.extensions.columns

		if (!press || !root || !columns || event.pointerId !== press.pointer) return

		const offset = event.clientX - press.origin

		if (!press.dragging) {
			// До порога нажатие остаётся нажатием
			if (Math.abs(offset) < START_DISTANCE) return

			if (!columns.dragStart(press.column)) {
				this._press = null

				return
			}

			press.dragging = true

			// Протяжка за таблицей и отпускание где угодно приходят корню. Среда
			// без захвата указателя (jsdom) ведёт жест без него
			if ('setPointerCapture' in root) root.setPointerCapture(event.pointerId)

			// Нажатие успело начать выделение текста подписи
			root.ownerDocument.getSelection()?.removeAllRanges()
			root.ownerDocument.addEventListener('keydown', this._onEscape, true)
		}

		if (isMeasurableElement(press.cell))
			press.cell.style.setProperty(DRAG_VARIABLE, `${offset}px`)

		columns.dragOver(this._placeAt(event.clientX, root, press.cell))
	}

	private readonly _onPointerUp = (event: PointerEvent): void => {
		if (this._press?.pointer !== event.pointerId) return

		this._end(true)
	}

	/** Браузер отнял указатель или корень ушёл — колонка остаётся на месте. */
	private readonly _onPointerCancel = (event: PointerEvent): void => {
		if (this._press?.pointer !== event.pointerId) return

		this._end(false)
	}

	/** Escape посреди жеста — отмена. Слушается на документе: фокус бывает вне таблицы. */
	private readonly _onEscape = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' || !this._press?.dragging) return

		event.preventDefault()
		this._end(false)
	}

	/** Закончить нажатие: отпустили — колонка встаёт на место, иначе — отмена. */
	private _end(commit: boolean): void {
		const press = this._press

		if (!press) return

		this._press = null

		if (!press.dragging) return

		this._root?.ownerDocument.removeEventListener('keydown', this._onEscape, true)

		if (isMeasurableElement(press.cell)) press.cell.style.removeProperty(DRAG_VARIABLE)

		const columns = this._engine?.extensions.columns

		if (commit) columns?.dragEnd()
		else columns?.dragCancel()
	}

	/* ------------------------------------------------------------------ */
	/* Клавиши                                                            */
	/* ------------------------------------------------------------------ */

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return

		const root = this._root
		const columns = this._engine?.extensions.columns
		const step = root ? arrowStep(slideDirection(AXIS, root), event.key) : null

		if (!root || !columns || step === null) return
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

		const hit = this._hit(event.target)

		if (!hit || !hit.column.reorderable || hit.column.disabled) return

		event.preventDefault()

		const from = this._shown.indexOf(hit.column)

		if (columns.moveColumn(hit.column, from + step)) this._keepFocus(event.target)
	}

	/**
	 * Фокус — тому же узлу после перерисовки шапки: переставленный заголовок
	 * браузер переносит в документе, и узел под фокусом при этом его теряет.
	 */
	private _keepFocus(target: EventTarget | null): void {
		if (!isFocusableElement(target)) return

		this._cancelFrame()
		this._frame = requestAnimationFrame(() => {
			this._frame = null

			if (target.isConnected && target.ownerDocument.activeElement !== target) target.focus()
		})
	}

	private _cancelFrame(): void {
		if (this._frame === null) return

		cancelAnimationFrame(this._frame)
		this._frame = null
	}
}
