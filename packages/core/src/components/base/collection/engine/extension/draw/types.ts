import type { IExtension } from '../types'

/**
 * Элемент, которого коллекция рисует: по `uid` у записи элемента и у распорки
 * перед ним свой ключ. Элементы коллекций компонентов — сущности (`IEntity`),
 * и `uid` у них числовой, от единицы.
 */
export type TDrawable = { readonly uid: number }

/** Элемент, который рисуется: сам элемент и его место среди показанных. Ключ — `uid`. */
export type TDrawnItem<TItem extends TDrawable = TDrawable> = {
	readonly kind: 'item'
	readonly key: number
	readonly item: TItem
	/** Место среди показанных (`batch.shown`), с нуля. */
	readonly place: number
}

/**
 * Распорка — пропущенные элементы одной полосой высотой в них.
 *
 * Ключ — от элемента, перед которым она стоит: его `uid` с минусом, у
 * хвостовой — `0`. С ключами элементов (их `uid`, от единицы) он не совпадает.
 * Ключ по счёту распорок не годится: он перешёл бы через элемент, закреплённый
 * вне окна, и фреймворк переставил бы его узел вместе с фокусом.
 *
 * `style` — высота переменной `--s-filler-height` и место в порядке элементов
 * коллекции (`order`): элементы в разметке стоят флексом по своему месту в
 * составе, и распорка встаёт перед тем, перед которым стоит в окне.
 */
export type TDrawnFiller = {
	readonly kind: 'filler'
	readonly key: number
	readonly style: Readonly<Record<string, string>>
}

/** Что коллекция рисует по порядку: элементы на своих местах и распорки между ними. */
export type TDrawnEntry<TItem extends TDrawable = TDrawable> = TDrawnItem<TItem> | TDrawnFiller

/**
 * Замер окна: видимая полоса в пикселях от верха первого показанного элемента
 * (`top`, `bottom` — могут выходить за список) и шаг (`step`) — расстояние
 * между верхами соседних элементов.
 */
export type TDrawViewport = {
	readonly top: number
	readonly bottom: number
	readonly step: number
}

/**
 * Стратегия рисования — какие из показанных элементов рисовать.
 *
 * По умолчанию коллекция рисует все показанные. Другую стратегию ставит тот,
 * кто окно включает (`useStrategy`), — окно (`TWindowStrategy`) рисует только
 * видимые элементы, а на месте остальных — распорки.
 */
export interface IDrawStrategy {
	/**
	 * Что рисовать по порядку. `pinned` — места элементов, которые рисуются
	 * всегда, на своих местах; `viewport` — последний замер, до замера `null`.
	 */
	draw<TItem extends TDrawable>(
		shown: ReadonlyArray<TItem>,
		pinned: ReadonlySet<number>,
		viewport: TDrawViewport | null,
	): TDrawnEntry<TItem>[]
}

export type TDrawEvents<TItem extends TDrawable = TDrawable> = {
	/** Сменилось, что рисовать: элементы или распорки */
	'change:drawn': (value: ReadonlyArray<TDrawnEntry<TItem>>) => void
	/** Окно поставили или сняли */
	'change:virtual': (value: boolean) => void
}

/**
 * Контракт расширения рисования — что коллекция рисует из показанных
 * элементов.
 */
export interface IDrawExtension<TItem extends TDrawable = TDrawable> extends IExtension<
	TItem,
	TDrawEvents<TItem>
> {
	/**
	 * Что рисовать по порядку. Без окна — все показанные элементы; в окне —
	 * видимые, закреплённые на своих местах и распорки между ними
	 */
	readonly drawn: ReadonlyArray<TDrawnEntry<TItem>>
	/** Стоит ли окно: в документе, возможно, не все показанные элементы */
	readonly virtual: boolean
	/** Поставить стратегию рисования; `null` — рисовать все показанные */
	useStrategy(strategy: IDrawStrategy | null): void
	/**
	 * Закрепить элемент: окно рисует его на месте, даже когда он вне видимой
	 * полосы. Закреплений несколько, по причине (`focus`, `highlight`), и
	 * каждое снимается своим `undefined`
	 */
	pin(reason: string, item: TItem | undefined): void
	/**
	 * Замер от плагина окна. Нулевой шаг — не замер (список скрыт или элементов
	 * в документе нет): окно остаётся прежним
	 */
	notifyViewport(viewport: TDrawViewport): void
}
