import type { ITableColumn } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { isMeasurableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import { arrowStep, slideDirection } from '../../slide/direction'
import type {
	ITableColumnResizePluginOptions,
	TTableColumnResizeGesture,
	TTableColumnResizePluginEvents,
} from './types'

/** Шаг стрелки и жеста скринридера, px, — пока опция не задана. */
const STEP = 10

/** Крупный шаг, px, — пока опция не задана: десять шагов. */
const LARGE_STEP = 100

/**
 * Ось ручки: ширина колонки растёт вдоль строки, к её концу, — горизонталь без
 * разворота. По ней направление письма сводится в сторону роста
 * (`slideDirection`), как у ползунка: от неё зависят и протяжка, и стрелки.
 */
const AXIS = { orientation: 'horizontal', inverted: false } as const

/** Сдвиг призрака от края колонки, px по оси окна: плюс — вправо. */
const GHOST_VARIABLE = '--s-table-column-ghost'

/** Высота призрака, px: от верха заголовка до низа таблицы в видимой части окна. */
const GHOST_SIZE_VARIABLE = '--s-table-column-ghost-size'

/**
 * Полоса ручки — ребёнок корня с классом `__resizer` владельца, по классу, а не
 * строкой в плагине. Только прямые дети: в заголовке может лежать что угодно,
 * вплоть до другой таблицы, и поиск вглубь нашёл бы её ручку.
 */
function resizerOf(column: ITableColumn, root: Element): Element | null {
	const className = column.classes.resolve('__resizer')

	return Array.from(root.children).find((child) => child.classList.contains(className)) ?? null
}

/** Поле ручки — ребёнок полосы `input`. */
function fieldOf(resizer: Element | null): HTMLInputElement | null {
	if (!resizer) return null

	return (
		Array.from(resizer.children).find(
			(child): child is HTMLInputElement => child instanceof HTMLInputElement,
		) ?? null
	)
}

/**
 * TTableColumnResizePlugin — ручка ширины колонки: указатель, клавиши и жест
 * скринридера.
 *
 * Операции над DOM — здесь, ширина — у колонки: плагин переводит указатель и
 * клавиши в px и зовёт её команды (`grab`, `drag`, `release`, `shift`,
 * `moveToEdge`). Какой станет ширина, в каких пределах и когда слать `commit`,
 * решает колонка, и жест она ведёт от своего итога ширины: ширины колонок
 * раскладывает ядро, и итог — та ширина, что видна. Сторону, куда колонка
 * растёт, плагин берёт у вычисленного направления письма (`slideDirection`):
 * ручка стоит у конца строки, и в RTL колонку расширяет движение влево.
 *
 * **Указатель** — на полосе ручки: нажатие с её захватом начинает жест,
 * протяжка двигает край, отпускание или отнятый указатель жест заканчивают.
 * Своих действий у нажатия нет (`preventDefault`): ни выделения текста, ни
 * своего фокуса браузера. Слушает корень, а не полосу: полосу разметка рисует
 * и убирает, а корень — заголовок — живёт всё монтирование, и захват
 * указателя держится на нём.
 *
 * **Отложенный жест** (`resizePreview: 'deferred'` таблицы) ширину до
 * отпускания не меняет: её будущую границу показывает призрак, которого
 * рисует тема по `data-resize-ghost` заголовка. Плагин пишет заголовку его
 * сдвиг от края колонки (`--s-table-column-ghost`, по оси окна, на каждый
 * шаг, если сменился) и высоту (`--s-table-column-ghost-size`, один раз на
 * нажатии: от верха заголовка до низа таблицы в окне браузера) и снимает их
 * в конце жеста. Переменные — на заголовке, а не на корне: запись на корень
 * пересчитала бы стиль каждой ячейки тела. Escape посреди жеста — отмена в
 * обоих режимах (`cancel` колонки).
 *
 * **Клавиши и жест скринридера** — у поля ручки, как у поля ползунка
 * (`TSlideKeyboardPlugin`): стрелки — шаг по стороне роста, Shift со стрелкой,
 * PageUp и PageDown — крупный шаг, Home и End — края хода. Поле браузер сдвинул
 * бы своим шагом, поэтому клавиши плагин берёт себе. Мобильный скринридер
 * клавиш не шлёт: свайп двигает поле и сообщает событием `input`, а плагин
 * переводит направление правки в шаг колонки и возвращает полю её ширину.
 * Шаги — опции установки.
 */
export class TTableColumnResizePlugin extends TBasePlugin<
	ITableColumn,
	TTableColumnResizePluginEvents
> {
	private _column: ITableColumn | null = null
	private _root: Element | null = null
	private _gesture: TTableColumnResizeGesture | null = null
	private _step = STEP
	private _largeStep = LARGE_STEP

	override install(ctx: IPluginContext, options?: ITableColumnResizePluginOptions): void {
		super.install(ctx, options)

		this._step = options?.step ?? this._step
		this._largeStep = options?.largeStep ?? this._largeStep
		this._column = ctx.getInstance<ITableColumn>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())
	}

	override destroy(): void {
		this._detach()
		this._column = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._detach()

		this._root = root

		const target: IDomEventTarget = root

		target.addEventListener('pointerdown', this._onPointerDown)
		target.addEventListener('pointermove', this._onPointerMove)
		target.addEventListener('pointerup', this._onPointerUp)
		target.addEventListener('pointercancel', this._onPointerUp)
		target.addEventListener('lostpointercapture', this._onPointerUp)
		target.addEventListener('keydown', this._onKeyDown)
		target.addEventListener('input', this._onInput)
	}

	private _detach(): void {
		this._end()

		const target: IDomEventTarget | null = this._root

		target?.removeEventListener('pointerdown', this._onPointerDown)
		target?.removeEventListener('pointermove', this._onPointerMove)
		target?.removeEventListener('pointerup', this._onPointerUp)
		target?.removeEventListener('pointercancel', this._onPointerUp)
		target?.removeEventListener('lostpointercapture', this._onPointerUp)
		target?.removeEventListener('keydown', this._onKeyDown)
		target?.removeEventListener('input', this._onInput)

		this._root = null
	}

	/* ------------------------------------------------------------------ */
	/* Указатель                                                          */
	/* ------------------------------------------------------------------ */

	private readonly _onPointerDown = (event: PointerEvent): void => {
		const column = this._column
		const root = this._root

		// Основная кнопка; жест уже идёт — второй указатель его не перехватывает
		if (!column || !root || this._gesture || event.button !== 0) return

		const resizer = resizerOf(column, root)

		if (!resizer || !(event.target instanceof Node) || !resizer.contains(event.target)) return

		// Чтения — до записей: высоту призрака плагин снимает один раз, на нажатии
		const sign = slideDirection(AXIS, root) === 'from-left' ? 1 : -1
		const ghostSize = column.resizePreview === 'deferred' ? this._ghostSize(root) : 0

		if (!column.grab()) return

		event.preventDefault()

		this._gesture = { pointer: event.pointerId, origin: event.clientX, sign, ghost: undefined }

		if (column.resizeGhost !== undefined && isMeasurableElement(root)) {
			root.style.setProperty(GHOST_SIZE_VARIABLE, `${ghostSize}px`)
			this._moveGhost(column, root)
		}

		// Протяжка за пределами заголовка и отпускание где угодно приходят
		// корню. Среда без захвата указателя (jsdom) ведёт жест без него:
		// события там приходят туда, куда их отправили
		if ('setPointerCapture' in root) root.setPointerCapture(event.pointerId)

		this._focus(fieldOf(resizer))
	}

	private readonly _onPointerMove = (event: PointerEvent): void => {
		const gesture = this._gesture

		if (!gesture || event.pointerId !== gesture.pointer) return

		const column = this._column

		if (!column) return

		column.drag((event.clientX - gesture.origin) * gesture.sign)

		if (this._root) this._moveGhost(column, this._root)
	}

	/**
	 * Призрак — на ширину, которую запишет отложенный жест: сдвиг от края
	 * колонки по оси окна. Ход колонка уже учла, поэтому за границы колонки
	 * призрак не уходит. Тот же сдвиг не пишется: переменная на заголовке
	 * пересчитывает его стиль. В живом жесте призрака нет.
	 */
	private _moveGhost(column: ITableColumn, root: Element): void {
		const gesture = this._gesture
		const ghost = column.resizeGhost
		const width = column.width

		if (!gesture || ghost === undefined || width === undefined) return

		const offset = (ghost - width) * gesture.sign

		if (offset === gesture.ghost || !isMeasurableElement(root)) return

		gesture.ghost = offset
		root.style.setProperty(GHOST_VARIABLE, `${offset}px`)
	}

	/**
	 * Высота призрака: от верха заголовка до низа таблицы, но не ниже окна
	 * браузера — таблица в тысячи строк дала бы линию в сотни тысяч px.
	 */
	private _ghostSize(root: Element): number {
		const table = root.closest('table') ?? root
		const view = root.ownerDocument.defaultView
		const bottom = table.getBoundingClientRect().bottom
		const top = root.getBoundingClientRect().top

		return Math.max(0, Math.min(bottom, view?.innerHeight ?? bottom) - top)
	}

	/** Снять переменные призрака: жест закончен. */
	private _clearGhost(): void {
		const root = this._root

		if (!isMeasurableElement(root)) return

		root.style.removeProperty(GHOST_VARIABLE)
		root.style.removeProperty(GHOST_SIZE_VARIABLE)
	}

	private readonly _onPointerUp = (event: PointerEvent): void => {
		const gesture = this._gesture

		if (!gesture || event.pointerId !== gesture.pointer) return

		this._end()
	}

	/** Закончить жест: отпустили, браузер отнял указатель или корень ушёл. */
	private _end(): void {
		const gesture = this._gesture

		if (!gesture) return

		this._gesture = null
		if (gesture.ghost !== undefined) this._clearGhost()
		this._column?.release()
	}

	/**
	 * Escape посреди жеста — отмена: ширина нажатия, без `commit`. Захват
	 * указателя плагин отпускает сам: протяжка дальше ширину не двигает.
	 */
	private _cancel(): void {
		const gesture = this._gesture
		const root = this._root

		if (!gesture) return

		this._gesture = null
		if (gesture.ghost !== undefined) this._clearGhost()
		this._column?.cancel()

		if (root && 'releasePointerCapture' in root && root.hasPointerCapture(gesture.pointer))
			root.releasePointerCapture(gesture.pointer)
	}

	/**
	 * Фокус — полю ручки, как у ползунка: клавиши продолжают с той ширины, на
	 * которой отпустили указатель. Без прокрутки: страница не должна прыгать к
	 * ручке, которую пользователь и так держит.
	 *
	 * И без кольца (`focusVisible: false`). Фокус ставит скрипт, а видимость
	 * такого фокуса браузер берёт у прошлого: пришёл тот не от мыши — свежая
	 * страница, Tab, — и нажатие мышью зажгло бы линию ручки, которую держит
	 * только фокус с клавиатуры.
	 */
	private _focus(field: HTMLInputElement | null): void {
		if (field && field.ownerDocument.activeElement !== field)
			field.focus({ preventScroll: true, focusVisible: false })
	}

	/* ------------------------------------------------------------------ */
	/* Клавиши и жест скринридера                                         */
	/* ------------------------------------------------------------------ */

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		// Escape отменяет жест, откуда бы ни пришла клавиша: фокус в жесте — на поле
		if (this._gesture && event.key === 'Escape') {
			event.preventDefault()
			this._cancel()

			return
		}

		// С модификатором — чужой жест: Alt+← у браузера «назад»
		if (event.altKey || event.ctrlKey || event.metaKey) return

		const column = this._column
		const root = this._root

		// Только клавиши самого поля: в заголовке своя клавиатура у кнопки
		// сортировки и у содержимого слота
		if (!column || !root || event.target !== fieldOf(resizerOf(column, root))) return

		const action = this._actionOf(column, root, event)

		if (!action) return

		// Поле само не сдвигается: иначе клавиша дала бы два шага — браузера и ядра
		event.preventDefault()

		action()
	}

	/** Что клавиша делает с шириной; не наша клавиша — `null`, её обработает браузер. */
	private _actionOf(
		column: ITableColumn,
		root: Element,
		event: KeyboardEvent,
	): (() => void) | null {
		switch (event.key) {
			case 'Home':
				return () => column.moveToEdge('start')
			case 'End':
				return () => column.moveToEdge('end')
			case 'PageUp':
				return () => column.shift(this._largeStep)
			case 'PageDown':
				return () => column.shift(-this._largeStep)
		}

		const step = arrowStep(slideDirection(AXIS, root), event.key)

		if (step === null) return null

		const size = event.shiftKey ? this._largeStep : this._step

		return () => column.shift(step * size)
	}

	/**
	 * Правка поля не клавишей — жестом скринридера. Колонка делает шаг в ту же
	 * сторону, а поле показывает её ширину: и когда шаг сделан, и когда упёрся в
	 * край хода.
	 */
	private readonly _onInput = (event: Event): void => {
		const column = this._column
		const root = this._root
		const field = event.target

		if (!column || !root || !(field instanceof HTMLInputElement)) return

		if (field !== fieldOf(resizerOf(column, root))) return

		const direction = Math.sign(Number(field.value) - column.resizer.value)

		// `NaN` и ноль — правки нет
		if (direction) column.shift(direction * this._step)

		const value = String(column.resizer.value)

		if (field.value !== value) field.value = value
	}
}
