import type { ICalendar, TCalendarCollection, TCalendarDate, TCalendarPicker } from '@soldy-ui/core'
import type { TCollectionElements } from '../collection'
import type { TCalendarDay, TCalendarPager, TCalendarPickerArrow } from './types'

/** Кнопки листания — по частям разметки владельца (`__prev`, `__next`). */
const PAGERS: readonly TCalendarPager[] = ['prev', 'next']

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
 * Стрелка панели выбора месяца и года, в которой лежит `target`, панель этой
 * стрелки и место панели среди `pickers`.
 *
 * Панель телепортирована — вне корня календаря, поэтому своей её делает не
 * место в DOM, а шапка: `id` шапки пишет плагин связок календаря, и панель,
 * в которой его нет, чужая. Части находят по классам владельца
 * (`classes.resolve`), как кнопки листания.
 */
export function pickerArrowOf(
	owner: ICalendar,
	pickers: readonly TCalendarPicker[],
	target: EventTarget | null,
): TCalendarPickerArrow | undefined {
	if (!(target instanceof Element)) return undefined

	for (const pager of PAGERS) {
		const arrow = target.closest(owner.classes.resolve(`__picker-${pager}`, { point: true }))
		const panel = arrow?.closest(owner.classes.resolve('__picker', { point: true }))

		if (!panel) continue

		const index = pickers.findIndex(({ labelledBy }) => {
			const heading = labelledBy ? panel.ownerDocument.getElementById(labelledBy) : null

			return heading !== null && panel.contains(heading)
		})

		return index === -1 ? undefined : { pager, index, panel }
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
