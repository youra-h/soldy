import { drawnFiller, drawnItem } from './entries'
import type { IDrawStrategy, TDrawable, TDrawnEntry, TDrawViewport } from './types'

/** Сколько элементов окно рисует до первого замера: серверная разметка и первый кадр. */
const INITIAL = 50

/** Запас элементов за каждым краем видимой полосы: прокрутка не успевает до пустоты. */
const OVERSCAN = 10

/** Ключ хвостовой распорки: за ней элементов нет, а `uid` элементов — от единицы. */
const TAIL_FILLER = 0

/**
 * Окно — стратегия рисования, при которой коллекция рисует только видимые
 * элементы: полосу замера с запасом (`OVERSCAN`) и закреплённые элементы на
 * своих местах, а на месте пропущенных — распорки высотой в них.
 *
 * Место элемента окно считает от шага замера: высота элементов — одна на все.
 * До первого замера окно — первые элементы (`INITIAL`), без распорок: высоты
 * пропущенного ещё не знает никто. Так рисуют сервер и первый кадр.
 *
 * **Окно не бывает пустым.** Полоса ушла за край списка — окно рисует
 * ближайший к ней элемент: по нарисованному элементу плагин окна находит, где
 * список, и без него следующий замер было бы не с чего начать.
 *
 * Ставит окно тот, кто его включает (`draw.useStrategy`), — обёртка `Virtual`.
 * Отдельным модулем, а не частью расширения рисования: коллекция без обёртки
 * код окна в сборку приложения не тянет.
 */
export class TWindowStrategy implements IDrawStrategy {
	draw<TItem extends TDrawable>(
		shown: ReadonlyArray<TItem>,
		pinned: ReadonlySet<number>,
		viewport: TDrawViewport | null,
	): TDrawnEntry<TItem>[] {
		const total = shown.length

		if (!viewport) return shown.slice(0, INITIAL).map((item, place) => drawnItem(item, place))

		if (total === 0) return []

		const { step } = viewport
		const start = clamp(Math.floor(viewport.top / step) - OVERSCAN, 0, total - 1)
		const end = clamp(Math.ceil(viewport.bottom / step) + OVERSCAN, start + 1, total)
		const places = new Set<number>(pinned)

		for (let place = start; place < end; place++) places.add(place)

		const entries: TDrawnEntry<TItem>[] = []
		let last = -1

		for (const place of [...places].sort((a, b) => a - b)) {
			const item = shown[place]

			if (place > last + 1) entries.push(drawnFiller(-item.uid, place - last - 1, step))

			entries.push(drawnItem(item, place))
			last = place
		}

		if (total > last + 1) entries.push(drawnFiller(TAIL_FILLER, total - last - 1, step))

		return entries
	}
}

/** Число в отрезке `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}
