import type { ITableColumn } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
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
 * TTableColumnResizePlugin — ручка ширины колонки: указатель, клавиши, жест
 * скринридера и замер.
 *
 * Операции над DOM — здесь, ширина — у колонки: плагин переводит указатель и
 * клавиши в px и зовёт её команды (`grab`, `drag`, `release`, `shift`,
 * `moveToEdge`). Какой станет ширина, в каких пределах и когда слать `commit`,
 * решает колонка. Сторону, куда колонка растёт, плагин берёт у вычисленного
 * направления письма (`slideDirection`): ручка стоит у конца строки, и в RTL
 * колонку расширяет движение влево.
 *
 * **Указатель** — на полосе ручки: нажатие с её захватом начинает жест с
 * замеренной ширины заголовка, протяжка двигает край, отпускание или отнятый
 * указатель жест заканчивают. Своих действий у нажатия нет (`preventDefault`):
 * ни выделения текста, ни своего фокуса браузера. Слушает корень, а не
 * полосу: полосу разметка рисует и убирает, а корень — заголовок — живёт всё
 * монтирование, и захват указателя держится на нём.
 *
 * **Клавиши и жест скринридера** — у поля ручки, как у поля ползунка
 * (`TSlideKeyboardPlugin`): стрелки — шаг по стороне роста, Shift со стрелкой,
 * PageUp и PageDown — крупный шаг, Home и End — края хода. Поле браузер сдвинул
 * бы своим шагом, поэтому клавиши плагин берёт себе. Мобильный скринридер
 * клавиш не шлёт: свайп двигает поле и сообщает событием `input`, а плагин
 * переводит направление правки в шаг колонки и возвращает полю её ширину.
 * Шаги — опции установки.
 *
 * **Замер.** Ширину колонки без своей ширины решает тема, и ручке её не
 * показать, пока её не сообщат колонке (`notifyWidth`). Мерит плагин —
 * `ResizeObserver` заголовка, раз в кадр: подряд идущие уведомления
 * схлопываются в один замер, и запись по нему не успевает свернуться в петлю
 * наблюдателя. Наблюдает он, только пока у колонки есть ручка (`resizable`):
 * режим выражен подпиской, а не проверкой в обработчике.
 */
export class TTableColumnResizePlugin extends TBasePlugin<
	ITableColumn,
	TTableColumnResizePluginEvents
> {
	private _column: ITableColumn | null = null
	private _root: Element | null = null
	private _gesture: TTableColumnResizeGesture | null = null
	private _observer: ResizeObserver | null = null
	private _frame: number | null = null
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

		// Колонка живёт дольше монтирования — свой `ctrl` таблицы и колонки из
		// данных переживают перерисовку, — поэтому подписка через базу: её
		// снимет `destroy()`
		this._listenTo(this._column?.events, 'change:resizable', this._onResizable)
	}

	override destroy(): void {
		this._detach()
		this._observer = null
		this._column = null

		super.destroy()
	}

	private readonly _onResizable = (): void => this._observe()

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

		this._observe()
	}

	private _detach(): void {
		this._end()
		this._observer?.disconnect()
		this._cancel()

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

		if (!column.grab(root.getBoundingClientRect().width)) return

		event.preventDefault()

		this._gesture = {
			pointer: event.pointerId,
			origin: event.clientX,
			sign: slideDirection(AXIS, root) === 'from-left' ? 1 : -1,
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

		this._column?.drag((event.clientX - gesture.origin) * gesture.sign)
	}

	private readonly _onPointerUp = (event: PointerEvent): void => {
		const gesture = this._gesture

		if (!gesture || event.pointerId !== gesture.pointer) return

		this._end()
	}

	/** Закончить жест: отпустили, браузер отнял указатель или корень ушёл. */
	private _end(): void {
		if (!this._gesture) return

		this._gesture = null
		this._column?.release()
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

	/* ------------------------------------------------------------------ */
	/* Замер                                                              */
	/* ------------------------------------------------------------------ */

	/** Наблюдать ширину заголовка — пока у колонки есть ручка. */
	private _observe(): void {
		this._observer?.disconnect()
		this._cancel()

		const root = this._root

		if (!root || !this._column?.resizable) return

		const observer = (this._observer ??= new ResizeObserver(this._schedule))

		observer.observe(root)
	}

	/** Замер — раз в кадр: подряд идущие уведомления схлопываются в один. */
	private readonly _schedule = (): void => {
		if (this._frame !== null) return

		this._frame = requestAnimationFrame(() => {
			this._frame = null
			this._measure()
		})
	}

	private _cancel(): void {
		if (this._frame === null) return

		cancelAnimationFrame(this._frame)
		this._frame = null
	}

	private _measure(): void {
		const root = this._root

		if (root) this._column?.notifyWidth(root.getBoundingClientRect().width)
	}
}
