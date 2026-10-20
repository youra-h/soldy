import type { ICalendar, TCalendarCollection, TCalendarDate, TCalendarPicker } from '@soldy-ui/core'
import type { TCollectionElements } from '../collection'
import { listOf } from '../list/row'
import type { TCalendarDay, TCalendarPager, TCalendarPickerHit, TCalendarPickerPart } from './types'

/** Кнопки листания — по частям разметки владельца (`__prev`, `__next`). */
const PAGERS: readonly TCalendarPager[] = ['prev', 'next']

/** Кнопки шапки панели выбора — `__picker-prev`, `__picker-next`, `__picker-heading`. */
const PICKER_PARTS: readonly TCalendarPickerPart[] = ['prev', 'next', 'heading']

/**
 * День календаря, в узле которого лежит `target`, — один поиск на оба плагина
 * календаря: клавиша, фокус, нажатие и наведение находят день одинаково.
 *
 * Узел дня — его корень, ячейка сетки; внутри неё плитка и содержимое слота,
 * и событие с них — тоже событие дня. Кому нужна сама ячейка (клавиши берутся
 * только с неё), сверяет `element` с целью события. Заполнитель соседнего
 * месяца днём не бывает: элемента коллекции у него нет, и узла среди узлов
 * дней — тоже.
 */
export function dayOf(
	engine: TCalendarCollection,
	elements: TCollectionElements | null,
	target: EventTarget | null,
): TCalendarDay | undefined {
	if (!elements || !(target instanceof Node)) return undefined

	for (const item of engine.extensions.batch.items) {
		const element = elements.getElementByItem(item)

		if (element?.contains(target)) return { item, element }
	}

	return undefined
}

/** Узел дня с такой датой, пока он в документе. */
export function dayElementOf(
	engine: TCalendarCollection,
	elements: TCollectionElements | null,
	date: TCalendarDate,
): Element | null {
	const item = engine.extensions.batch.items.find((candidate) => candidate.date === date)
	const element = item ? (elements?.getElementByItem(item) ?? null) : null

	return element?.isConnected ? element : null
}

/**
 * Лежит ли в узле шапка места `picker` — по ней панель выбора и узнаётся своей.
 *
 * Своей и своего места панель делает не место в DOM, а шапка: `id` шапки
 * места пишет плагин связок календаря, и панель, в которой его нет, чужая —
 * например, панель календаря, вложенного в этот.
 */
function holdsHeading(node: Element, { labelledBy }: TCalendarPicker): boolean {
	const heading = labelledBy ? node.ownerDocument.getElementById(labelledBy) : null

	return heading !== null && node.contains(heading)
}

/**
 * Кнопка шапки панели выбора месяца и года, в которой лежит `target`, панель
 * этой кнопки и место панели среди `pickers` — один поиск на оба плагина
 * календаря.
 *
 * Своей панель делает шапка места (`holdsHeading`). Части находят по классам
 * владельца (`classes.resolve`), как кнопки листания.
 */
export function pickerPartOf(
	owner: ICalendar,
	pickers: readonly TCalendarPicker[],
	target: EventTarget | null,
): TCalendarPickerHit | undefined {
	if (!(target instanceof Element)) return undefined

	for (const part of PICKER_PARTS) {
		const button = target.closest(owner.classes.resolve(`__picker-${part}`, { point: true }))
		const panel = button?.closest(owner.classes.resolve('__picker', { point: true }))

		if (!panel) continue

		const index = pickers.findIndex((picker) => holdsHeading(panel, picker))

		return index === -1 ? undefined : { part, index, panel }
	}

	return undefined
}

/**
 * Карточка панели выбора места `picker` в корне — ту же карточку отдаёт
 * `pickerPartOf` от кнопки её шапки. Своей её делает шапка места
 * (`holdsHeading`), часть находят по классу владельца (`classes.resolve`).
 * `null` — карточки в документе нет: содержимое поповера не смонтировано до
 * первого открытия.
 */
export function pickerPanelOf(
	owner: ICalendar,
	root: Element,
	picker: TCalendarPicker,
): Element | null {
	for (const panel of root.querySelectorAll(owner.classes.resolve('__picker', { point: true }))) {
		if (holdsHeading(panel, picker)) return panel
	}

	return null
}

/**
 * Список карточки панели выбора — узел списка ListBox (`listOf`): остановка
 * Tab у списка — он, а не корень ListBox с классом части календаря. `null` —
 * карточки или списка в ней нет.
 *
 * Один на клавиатуру календаря (кому отдать фокус со стрелки, погасшей у
 * границы лет) и остановку календаря, пока панель открыта (`gridStopOf`).
 */
export function pickerListOf(owner: ICalendar, panel: Element | null): Element | null {
	const list = panel?.querySelector(owner.classes.resolve('__picker-list', { point: true }))

	return listOf(list ?? null)
}

/**
 * Место, чья подложка — `target`; `target` не подложка — `undefined`.
 *
 * Подложка — сама панель поповера места, а не узел в ней: панель накрывает
 * календарь, а выбирают в её содержимом, и у нажатия мимо содержимого цель —
 * панель. Псевдоэлемент панели — тоже панель: у нажатия по нему та же цель.
 * Панель находят по классу её поповера (`classes.resolve`), своей её делает
 * шапка места (`holdsHeading`).
 */
export function pickerBackdropOf(
	pickers: readonly TCalendarPicker[],
	target: EventTarget | null,
): number | undefined {
	if (!(target instanceof Element)) return undefined

	const index = pickers.findIndex(
		(picker) =>
			target.matches(picker.popover.classes.resolve('__panel', { point: true })) &&
			holdsHeading(target, picker),
	)

	return index === -1 ? undefined : index
}

/**
 * Кнопка листания, в которой лежит `target`. Кнопки находят по классам
 * владельца (`classes.resolve`), а не строкой в плагине, и только внутри его
 * корня.
 */
export function pagerOf(
	owner: ICalendar,
	root: Element,
	target: EventTarget | null,
): TCalendarPager | undefined {
	if (!(target instanceof Element)) return undefined

	return PAGERS.find((pager) => {
		const button = target.closest(owner.classes.resolve(`__${pager}`, { point: true }))

		return button !== null && root.contains(button)
	})
}
