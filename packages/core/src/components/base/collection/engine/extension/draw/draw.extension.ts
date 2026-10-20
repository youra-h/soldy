import type { IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import { batchOf, groupOf } from '../neighbours'
import type { TGroup, TGroupSection } from '../group/types'
import { drawnItem } from './entries'
import type {
	IDrawExtension,
	IDrawStrategy,
	TDrawable,
	TDrawEvents,
	TDrawnEntry,
	TDrawnFiller,
	TDrawnItem,
	TDrawnSection,
	TDrawViewport,
} from './types'

/**
 * Ключ секции записей без группы — тот же, что у такой секции группировки
 * (`group.sections`): разметка рисует ту же петлю по ключу и с группировкой, и
 * без неё.
 */
const FREE_SECTION = 'free'

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
 * всё. `virtual` — рисует ли окно.
 *
 * **Входы окна — замер и закрепления.** Видимую полосу и шаг элементов мерит
 * плагин окна (`notifyViewport`): высота элементов одна на все, и место
 * элемента окно считает от шага. Закреплённые элементы (`pin`) окно рисует на
 * их местах, даже когда они вне полосы: элемент с DOM-фокусом, подсвеченный
 * клавиатурой, строка ячейки сетки. Закреплений несколько — по причине, и
 * каждое снимает только его причина.
 *
 * **Группы — секциями нарисованного, и без окна.** Коллекция с группировкой
 * (сосед `group`, ListBox и Select) рисует показанное секциями: группу —
 * обёрткой с подписью, между соседними секциями — разделитель, если его
 * просит владелец (`groupSeparators`). Записи по секциям отдаёт
 * `drawnSections`, и разметка — петля по секциям, а в секции — по её
 * записям; без групп секция одна, со всеми записями, распорками тоже.
 * Окно считает строки одной высоты, а подпись группы и разделитель — не строки
 * окна, и место элемента от шага разошлось бы с экраном. Поэтому
 * сгруппированное показанное окно не рисует: пока среди показанных есть
 * элемент группы, коллекция рисует все показанные, а `virtual` — `false`.
 * Группировка ставится раньше рисования: на смену показанных её секции уже
 * пересчитаны, а смену одной подписи рисование узнаёт по `change:sections`.
 *
 * `change:drawn`, `change:drawnSections` и `change:virtual` — только на смену,
 * в этом порядке, когда к ним привела одна запись.
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

	private _drawnSections: ReadonlyArray<TDrawnSection<TItem>> = []

	/** Рисует ли окно: стратегия стоит, и показанное не сгруппировано. */
	private _virtual = false

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Показанные элементы сменились — состав, отбор или порядок
		batchOf(ctx)?.events.on('change:shown', () => this._update())

		// Секции группировки сменились без смены показанных — подпись группы
		groupOf(ctx)?.events.on('change:sections', () => this._update())

		this._update()
	}

	get drawn(): ReadonlyArray<TDrawnEntry<TItem>> {
		return this._drawn
	}

	get drawnSections(): ReadonlyArray<TDrawnSection<TItem>> {
		return this._drawnSections
	}

	get virtual(): boolean {
		return this._virtual
	}

	useStrategy(strategy: IDrawStrategy | null): void {
		if (this._strategy === strategy) return

		this._strategy = strategy
		this._update()
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

	/**
	 * Что рисовать и по каким секциям — заново. Состояние пишется целиком до
	 * событий: подписчик `change:drawn` видит уже новые секции и `virtual`.
	 * События — только на смену.
	 */
	private _update(): void {
		const shown = batchOf(this._ctx)?.shown ?? []
		const sections = groupOf(this._ctx)?.sections ?? []
		const grouped = sections.some((section) => section.group !== null)
		const strategy = grouped ? null : this._strategy
		const next = strategy
			? this._placeFillers(strategy.draw(shown, this._pinnedPlaces(shown), this._viewport))
			: drawAll(shown)

		const drawnChanged = !sameDrawn(this._drawn, next)

		if (drawnChanged) this._drawn = next

		const nextSections = grouped
			? groupedSections(this._drawn, sections)
			: wholeSection(this._drawn)
		const sectionsChanged = !sameSections(this._drawnSections, nextSections)

		if (sectionsChanged) this._drawnSections = nextSections

		const virtual = strategy !== null
		const virtualChanged = virtual !== this._virtual

		this._virtual = virtual

		if (drawnChanged) this.events.emit('change:drawn', this._drawn)
		if (sectionsChanged) this.events.emit('change:drawnSections', this._drawnSections)
		if (virtualChanged) this.events.emit('change:virtual', virtual)
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

/** Без групп секция одна — все записи, распорки окна тоже; без записей секций нет. */
function wholeSection<TItem extends TDrawable>(
	drawn: ReadonlyArray<TDrawnEntry<TItem>>,
): TDrawnSection<TItem>[] {
	return drawn.length > 0 ? [{ key: FREE_SECTION, group: null, entries: drawn }] : []
}

/**
 * Записи по секциям группировки. Сгруппированное окно не рисует, поэтому
 * запись есть у каждого показанного элемента; элемент секции, которого среди
 * нарисованных нет, — не в счёт.
 */
function groupedSections<TItem extends TDrawable>(
	drawn: ReadonlyArray<TDrawnEntry<TItem>>,
	sections: ReadonlyArray<TGroupSection<TItem>>,
): TDrawnSection<TItem>[] {
	const entries = new Map<TItem, TDrawnItem<TItem>>()

	for (const entry of drawn) {
		if (entry.kind === 'item') entries.set(entry.item, entry)
	}

	return sections.map(({ key, group, items }) => ({
		key,
		group,
		entries: items.flatMap((item) => entries.get(item) ?? []),
	}))
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

/** Та же группа секции: обе без группы или тот же ключ с той же подписью. */
function sameGroup(a: TGroup | null, b: TGroup | null): boolean {
	if (a === null || b === null) return a === b

	return a.key === b.key && a.label === b.label
}

/**
 * Те же секции: те же ключи и группы с теми же записями тем же порядком.
 * Записи сверяются по ссылке: `drawn`, который не сменился, остаётся прежним
 * массивом с прежними записями, а сменившийся — уже другие записи.
 */
function sameSections<TItem extends TDrawable>(
	a: ReadonlyArray<TDrawnSection<TItem>>,
	b: ReadonlyArray<TDrawnSection<TItem>>,
): boolean {
	return (
		a.length === b.length &&
		a.every((section, index) => {
			const other = b[index]

			return (
				section.key === other.key &&
				sameGroup(section.group, other.group) &&
				section.entries.length === other.entries.length &&
				section.entries.every((entry, place) => entry === other.entries[place])
			)
		})
	)
}
