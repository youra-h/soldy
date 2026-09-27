import type { ICalendar, TCalendarCollection, TCalendarDate } from '@soldy-ui/core'
import type { TCollectionElements } from '../collection'
import type { TCalendarDay, TCalendarPager } from './types'

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
