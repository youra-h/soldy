import type { ICalendar, TCalendarCollection, TCalendarDate, TCalendarPicker } from '@soldy-ui/core'
import type { TCollectionElements } from '../collection'
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
 * Кнопка шапки панели выбора месяца и года, в которой лежит `target`, панель
 * этой кнопки и место панели среди `pickers` — один поиск на оба плагина
 * календаря.
 *
 * Своей и своего места панель делает не место в DOM, а шапка: `id` шапки
 * места пишет плагин связок календаря, и панель, в которой его нет, чужая —
 * например, панель календаря, вложенного в этот. Части находят по классам
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

		const index = pickers.findIndex(({ labelledBy }) => {
			const heading = labelledBy ? panel.ownerDocument.getElementById(labelledBy) : null

			return heading !== null && panel.contains(heading)
		})

		return index === -1 ? undefined : { part, index, panel }
	}

	return undefined
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
