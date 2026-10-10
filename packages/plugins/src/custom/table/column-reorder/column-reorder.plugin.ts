import type { ITable, ITableColumn, TTableCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import type { IDomEventTarget } from '../../../utils'
import { afterTransitions, isFocusableElement, isMeasurableElement } from '../../../utils'
import { arrowStep, slideDirection } from '../../slide/direction'
import type {
	TTableColumnReorderBox,
	TTableColumnReorderGesture,
	TTableColumnReorderLanding,
	TTableColumnReorderPluginEvents,
	TTableColumnReorderPress,
} from './types'

/**
 * Переменная сдвига взятого заголовка — контракт с темой. Значение — px по
 * оси окна от его места: пока колонку несут — от места нажатия, и заголовок
 * идёт за указателем; когда отпустили — до места, куда колонка встанет, и
 * тема довозит его туда переходом. Колонка под ним стоит на месте. Без жеста
 * переменной нет.
 */
const DRAG_VARIABLE = '--s-table-column-drag'

/**
 * Переменная сдвига соседей — контракт с темой, на корне таблицы: ширина
 * взятого заголовка, px. На неё уступают место колонки между взятой и местом,
 * куда её несут (`data-shift`), — в шапке и, если тема ведёт тело, в теле.
 * Без жеста переменной нет.
 */
const SHIFT_VARIABLE = '--s-table-column-shift'

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
 * Сдвиг взятого заголовка до места `place`: его край, дальний от исходного
 * места, встаёт на тот же край заголовка, который там стоит, — там взятый
 * окажется после перестановки, потому что колонки между ними уступают ему
 * ровно его ширину. Направление письма считать не нужно: дальний край — тот,
 * к которому заголовок едет. На своём месте — ноль.
 */
function landingOffset(gesture: TTableColumnReorderGesture, place: number): number {
	const own = gesture.boxes[gesture.from]
	const target = gesture.boxes[place]

	if (!own || !target) return 0

	return target.left > own.left
		? target.left + target.width - (own.left + own.width)
		: target.left - own.left
}

/**
 * TTableColumnReorderPlugin — перестановка колонок пользователем: заголовок
 * тащат указателем или сдвигают Ctrl+Shift+←/→.
 *
 * Операции над DOM — здесь, место колонки — у расширения `columns` коллекции
 * строк: плагин переводит указатель и клавиши в его команды (`dragStart`,
 * `dragOver`, `dragDrop`, `dragEnd`, `dragCancel`, `moveColumn`). Какую
 * колонку можно взять, куда она встанет, какие метки получат колонки и что
 * сообщить приложению, решает расширение. Движок плагин узнаёт от реестра
 * bundles (`engine:bound`).
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
 * сюда, а `click` отпускания до кнопки сортировки не доходит.
 *
 * Взяв колонку, плагин снимает коробки заголовков — относительно корня, один
 * раз — и пишет корню ширину взятого (`--s-table-column-shift`): на неё тема
 * сдвигает соседей, которым расширение поставило `data-shift`. Место, куда
 * колонка встанет, плагин считает по серединам остальных заголовков из
 * снимка, а не из документа: сдвинутые соседи не двигают пороги, и место не
 * прыгает, а прокрутку посреди жеста учитывает коробка корня. Взятый
 * заголовок идёт за указателем — переменная сдвига на нём.
 *
 * **Шапка стоит** — таблица в `none` (`dragPreview` расширения на старте
 * жеста): ширину взятого плагин корню не пишет, а отпускание переставляет
 * колонку сразу, `dragEnd` (отмена — `dragCancel`), без приземления — как
 * до живого жеста. Остальное то же: снимок, место, заголовок за указателем.
 *
 * **Отпустили** — колонка не переставляется сразу: расширение замораживает
 * место (`dragDrop`, `data-landing`), а кадром позже, когда метка уже в
 * разметке, заголовок получает сдвиг до места, где встанет, и тема довозит
 * его переходом. Доиграл переход заголовка — `dragEnd`: перестановка и снятие
 * меток одной операцией, и переменные сняты тут же. К этому времени заголовки
 * и ячейки стоят там, где их поставит новая раскладка, а переходы тема
 * выключает вместе с жестом, — ничего не отъезжает. Без движения переходов
 * нет, и колонка встаёт через кадр. Отнятый указатель и Escape — то же
 * приземление на своё место и `dragCancel`. Сколько ждать, решает тема —
 * плагин режима движения не читает.
 *
 * Нажатие и Ctrl+Shift+←/→, пришедшие, пока заголовок приземляется,
 * доводят приземление сразу: следующее действие видит модель и шапку в одном
 * порядке. Заголовок под ними плагин находит до доводки — после неё модель
 * уже в новом порядке, а шапка ещё нет.
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
	private _landing: TTableColumnReorderLanding | null = null
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
		this._abort()
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

	/** Коробки заголовков по строке — относительно корня: снимок на старте жеста. */
	private _boxes(root: Element): TTableColumnReorderBox[] {
		const origin = root.getBoundingClientRect().left

		return this._headers().map((cell) => {
			const box = cell.getBoundingClientRect()

			return { left: box.left - origin, width: box.width }
		})
	}

	/**
	 * Место среди показанных, куда встанет взятая колонка, — сколько остальных
	 * заголовков серединой стоят раньше указателя по строке. Середины — из
	 * снимка на старте жеста, от нынешнего края корня: заголовки, которые тема
	 * сдвинула, порогов не двигают. Свой заголовок не в счёт: он идёт за
	 * указателем.
	 */
	private _placeAt(x: number, root: Element, gesture: TTableColumnReorderGesture): number {
		const ltr = slideDirection(AXIS, root) === 'from-left'
		const origin = root.getBoundingClientRect().left

		return gesture.boxes.filter((box, index) => {
			if (index === gesture.from) return false

			const middle = origin + box.left + box.width / 2

			return ltr ? x > middle : x < middle
		}).length
	}

	/* ------------------------------------------------------------------ */
	/* Указатель                                                          */
	/* ------------------------------------------------------------------ */

	private readonly _onPointerDown = (event: PointerEvent): void => {
		// Жест уже идёт
		if (this._press) return

		// Заголовок — до доводки приземления: после неё модель уже в новом
		// порядке, а шапка ещё нет
		const hit = this._hit(event.target)

		this._finishLanding()

		// Основная кнопка; нажатие уже взяли — ручка ширины гасит своё
		if (event.button !== 0 || event.defaultPrevented) return
		if (!hit || !hit.column.reorderable || hit.column.disabled) return

		this._press = {
			pointer: event.pointerId,
			origin: event.clientX,
			column: hit.column,
			cell: hit.cell,
			gesture: null,
		}
	}

	private readonly _onPointerMove = (event: PointerEvent): void => {
		const press = this._press
		const root = this._root
		const columns = this._engine?.extensions.columns

		if (!press || !root || !columns || event.pointerId !== press.pointer) return

		const offset = event.clientX - press.origin

		if (!press.gesture) {
			// До порога нажатие остаётся нажатием
			if (Math.abs(offset) < START_DISTANCE) return

			if (!columns.dragStart(press.column)) {
				this._press = null

				return
			}

			press.gesture = this._takeGesture(root, press.column, columns.dragPreview === 'none')

			if (!press.gesture) {
				// Шапка не дорисовала смену колонок: мерить нечего
				columns.dragCancel()
				this._press = null

				return
			}

			// Протяжка за таблицей и отпускание где угодно приходят корню. Среда
			// без захвата указателя (jsdom) ведёт жест без него
			if ('setPointerCapture' in root) root.setPointerCapture(event.pointerId)

			// Нажатие успело начать выделение текста подписи
			root.ownerDocument.getSelection()?.removeAllRanges()
			root.ownerDocument.addEventListener('keydown', this._onEscape, true)
		}

		if (isMeasurableElement(press.cell))
			press.cell.style.setProperty(DRAG_VARIABLE, `${offset}px`)

		press.gesture.place = this._placeAt(event.clientX, root, press.gesture)
		columns.dragOver(press.gesture.place)
	}

	/**
	 * Колонку взяли: снимок заголовков — до сдвига взятого, — и корню ширина
	 * взятого, на которую тема сдвигает соседей. Шапка стоит (`still`, таблица
	 * в `none`) — ширины нет: соседям сдвигаться не на что, а переменная корня
	 * переписала бы стиль всем ячейкам таблицы. Заголовков нет — жеста нет.
	 */
	private _takeGesture(
		root: Element,
		column: ITableColumn,
		still: boolean,
	): TTableColumnReorderGesture | null {
		const boxes = this._boxes(root)
		const from = this._shown.indexOf(column)
		const own = boxes[from]

		if (!own) return null

		if (!still && isMeasurableElement(root))
			root.style.setProperty(SHIFT_VARIABLE, `${own.width}px`)

		return { boxes, from, place: from, still }
	}

	private readonly _onPointerUp = (event: PointerEvent): void => {
		if (this._press?.pointer !== event.pointerId) return

		this._release(true)
	}

	/** Браузер отнял указатель или корень ушёл — колонка возвращается на место. */
	private readonly _onPointerCancel = (event: PointerEvent): void => {
		if (this._press?.pointer !== event.pointerId) return

		this._release(false)
	}

	/** Escape посреди жеста — отмена. Слушается на документе: фокус бывает вне таблицы. */
	private readonly _onEscape = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' || !this._press?.gesture) return

		event.preventDefault()
		this._release(false)
	}

	/**
	 * Закончить нажатие: отпустили — заголовок приземляется на место, куда
	 * колонку принесли, отмена — на своё, и соседи возвращаются. Коллекцию
	 * переставит конец приземления.
	 */
	private _release(commit: boolean): void {
		const press = this._press
		const gesture = press?.gesture

		this._press = null

		if (!press || !gesture) return

		this._root?.ownerDocument.removeEventListener('keydown', this._onEscape, true)

		const columns = this._engine?.extensions.columns
		const place = commit ? gesture.place : gesture.from

		// Шапка стоит — приземления нет: колонка встаёт на отпускании
		if (gesture.still) {
			if (commit) columns?.dragEnd()
			else columns?.dragCancel()

			this._clearVariables(press.cell)

			return
		}

		if (!commit) columns?.dragOver(gesture.from)

		columns?.dragDrop()
		this._land(press.cell, landingOffset(gesture, place), commit)
	}

	/* ------------------------------------------------------------------ */
	/* Приземление                                                        */
	/* ------------------------------------------------------------------ */

	/**
	 * Заголовок — на место: кадром позже, когда `data-landing` уже в разметке
	 * и тема ведёт его переходом, — так же сдвиг отпущенной панели снимает
	 * `TSwipePlugin`. Конец — когда заголовок доиграл свои переходы.
	 */
	private _land(cell: Element, offset: number, commit: boolean): void {
		const landing: TTableColumnReorderLanding = { cell, commit, frame: null, wait: null }

		this._landing = landing

		landing.frame = requestAnimationFrame(() => {
			landing.frame = null

			if (isMeasurableElement(cell)) cell.style.setProperty(DRAG_VARIABLE, `${offset}px`)

			landing.wait = afterTransitions(cell, () => {
				if (this._landing === landing) this._landed()
			})
		})
	}

	/** Заголовок встал: колонка — на место, метки и переменные сняты. */
	private _landed(): void {
		const landing = this._landing

		if (!landing) return

		this._landing = null

		const columns = this._engine?.extensions.columns

		if (landing.commit) columns?.dragEnd()
		else columns?.dragCancel()

		this._clearVariables(landing.cell)
	}

	/** Довести приземление сразу — без кадра и без ожидания переходов. */
	private _finishLanding(): void {
		const landing = this._landing

		if (!landing) return

		if (landing.frame !== null) cancelAnimationFrame(landing.frame)

		landing.wait?.()
		this._landed()
	}

	/**
	 * Корень ушёл: жест и приземление — прочь без перестановки, ожидания и
	 * кадры сняты.
	 */
	private _abort(): void {
		const press = this._press
		const landing = this._landing

		this._press = null
		this._landing = null

		if (landing) {
			if (landing.frame !== null) cancelAnimationFrame(landing.frame)

			landing.wait?.()
		}

		const cell = landing?.cell ?? (press?.gesture ? press.cell : null)

		if (!cell) return

		this._root?.ownerDocument.removeEventListener('keydown', this._onEscape, true)
		this._engine?.extensions.columns.dragCancel()
		this._clearVariables(cell)
	}

	private _clearVariables(cell: Element): void {
		if (isMeasurableElement(cell)) cell.style.removeProperty(DRAG_VARIABLE)
		if (isMeasurableElement(this._root)) this._root.style.removeProperty(SHIFT_VARIABLE)
	}

	/* ------------------------------------------------------------------ */
	/* Клавиши                                                            */
	/* ------------------------------------------------------------------ */

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

		const root = this._root
		const step = root ? arrowStep(slideDirection(AXIS, root), event.key) : null

		if (!root || step === null) return

		// Заголовок — до доводки приземления: после неё модель уже в новом
		// порядке, а шапка ещё нет
		const hit = this._hit(event.target)

		this._finishLanding()

		const columns = this._engine?.extensions.columns

		if (!columns || !hit || !hit.column.reorderable || hit.column.disabled) return

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
