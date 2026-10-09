import type { IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import { batchOf } from '../neighbours'
import { drawnItem } from './entries'
import type {
	IDrawExtension,
	IDrawStrategy,
	TDrawable,
	TDrawEvents,
	TDrawnEntry,
	TDrawnFiller,
	TDrawViewport,
} from './types'

/**
 * Без окна коллекция рисует все показанные элементы, каждый на своём месте.
 * Отдельной стратегией не выставлена: `null` у `useStrategy` и есть она.
 */
function drawAll<TItem extends TDrawable>(shown: ReadonlyArray<TItem>): TDrawnEntry<TItem>[] {
	return shown.map((item, place) => drawnItem(item, place))
}

/**
 * TDrawExtension — что коллекция рисует из показанных элементов.
 *
 * Тысячи элементов в документе — это тысячи компонентов и сотни тысяч узлов:
 * память, первый рендер и раскладка браузера после каждой сортировки. Окно
 * рисует только видимые элементы с запасом, а пропущенные заменяет
 * распорками высотой в них — полоса прокрутки и места элементов остаются как
 * у полного списка.
 *
 * **Рисование читает показанные элементы, а не подменяет их.** `batch.shown`
 * — все показанные, и выбор, навигация, счёт и сортировка видят их все. Что
 * рисовать, расширение отдаёт отдельным выходом (`drawn`): элементы на своих
 * местах и распорки по порядку. Без окна это все показанные, и разметка одна
 * петля на оба случая.
 *
 * **Стратегия, а не флаг.** Какие элементы рисовать, решает стратегия
 * (`useStrategy`), как память выборки решает за драйвер, как читать: по
 * умолчанию — все показанные, окно (`TWindowStrategy`) ставит тот, кто его
 * включает, — обёртка `Virtual` над компонентом. Так код окна попадает в
 * сборку приложения только вместе с обёрткой, а коллекция без неё рисует
 * всё. `virtual` — стоит ли окно.
 *
 * **Входы окна — замер и закрепления.** Видимую полосу и шаг элементов мерит
 * плагин окна (`notifyViewport`): высота элементов одна на все, и место
 * элемента окно считает от шага. Закреплённые элементы (`pin`) окно рисует на
 * их местах, даже когда они вне полосы: элемент с DOM-фокусом, подсвеченный
 * клавиатурой, строка ячейки сетки. Закреплений несколько — по причине, и
 * каждое снимает только его причина.
 *
 * `change:drawn` и `change:virtual` — только на смену.
 */
export class TDrawExtension<TItem extends TDrawable = any>
	extends TBaseExtension<TItem, TDrawEvents<TItem>>
	implements IDrawExtension<TItem>
{
	readonly name = 'draw' as const

	private _strategy: IDrawStrategy | null = null

	private _viewport: TDrawViewport | null = null

	/** Закреплённые элементы по причине. */
	private readonly _pins = new Map<string, TItem>()

	private _drawn: ReadonlyArray<TDrawnEntry<TItem>> = []

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Показанные элементы сменились — состав, отбор или порядок
		batchOf(ctx)?.events.on('change:shown', () => this._update())

		this._update()
	}

	get drawn(): ReadonlyArray<TDrawnEntry<TItem>> {
		return this._drawn
	}

	get virtual(): boolean {
		return this._strategy !== null
	}

	useStrategy(strategy: IDrawStrategy | null): void {
		if (this._strategy === strategy) return

		const virtual = this.virtual

		this._strategy = strategy
		this._update()

		if (virtual !== this.virtual) this.events.emit('change:virtual', this.virtual)
	}

	pin(reason: string, item: TItem | undefined): void {
		if (this._pins.get(reason) === item) return

		if (item === undefined) this._pins.delete(reason)
		else this._pins.set(reason, item)

		// Без окна в документе все показанные — закреплять нечего
		if (this.virtual) this._update()
	}

	notifyViewport(viewport: TDrawViewport): void {
		if (!(viewport.step > 0)) return

		this._viewport = viewport

		if (this.virtual) this._update()
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Что рисовать — заново. Событие — только на смену. */
	private _update(): void {
		const shown = batchOf(this._ctx)?.shown ?? []
		const strategy = this._strategy
		const next = strategy
			? this._placeFillers(strategy.draw(shown, this._pinnedPlaces(shown), this._viewport))
			: drawAll(shown)

		if (sameDrawn(this._drawn, next)) return

		this._drawn = next
		this.events.emit('change:drawn', next)
	}

	/**
	 * Распорке — место в порядке элементов коллекции, как у элемента: CSS
	 * `order` — индекс в составе элемента, перед которым она стоит, у хвостовой
	 * — число элементов. Разметка ставит элементы коллекции флексом по их месту
	 * в составе (`order` элемента: так элемент разметки встаёт на своё место
	 * после перестановки), и распорка без своего места ушла бы в начало списка.
	 * Таблице место не мешает: строки — не флекс.
	 */
	private _placeFillers(entries: TDrawnEntry<TItem>[]): TDrawnEntry<TItem>[] {
		if (!entries.some((entry) => entry.kind === 'filler')) return entries

		const items = batchOf(this._ctx)?.items ?? []

		return entries.map((entry, index) => {
			if (entry.kind !== 'filler') return entry

			const next = entries[index + 1]
			const order = next?.kind === 'item' ? items.indexOf(next.item) : items.length

			return { ...entry, style: { ...entry.style, order: String(order) } }
		})
	}

	/** Места закреплённых элементов среди показанных; не показанные — не в счёт. */
	private _pinnedPlaces(shown: ReadonlyArray<TItem>): Set<number> {
		const places = new Set<number>()

		for (const item of this._pins.values()) {
			const place = shown.indexOf(item)

			if (place !== -1) places.add(place)
		}

		return places
	}
}

/** То же самое: те же элементы на тех же местах и распорки того же стиля тем же порядком. */
function sameDrawn<TItem extends TDrawable>(
	a: ReadonlyArray<TDrawnEntry<TItem>>,
	b: ReadonlyArray<TDrawnEntry<TItem>>,
): boolean {
	return (
		a.length === b.length &&
		a.every((entry, index) => {
			const other = b[index]

			if (entry.kind === 'item') {
				return (
					other.kind === 'item' &&
					other.item === entry.item &&
					other.place === entry.place
				)
			}

			return other.kind === 'filler' && other.key === entry.key && sameStyle(other, entry)
		})
	)
}

/** Тот же стиль распорки: те же свойства с теми же значениями. */
function sameStyle(a: TDrawnFiller, b: TDrawnFiller): boolean {
	const keys = Object.keys(a.style)

	return (
		keys.length === Object.keys(b.style).length &&
		keys.every((key) => a.style[key] === b.style[key])
	)
}
