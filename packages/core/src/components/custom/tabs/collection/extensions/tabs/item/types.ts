import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'

export type TTabsItemEventsExtension = TBaseItemEventsExtension & {
	/**
	 * `closable` таба изменился — перечитайте геттер `closable`.
	 *
	 * Аргумента нет намеренно. Значение вычисляемое (`элемент ?? родитель`), а
	 * источников у него два, и ни один не равен результату: элемент шлёт
	 * `undefined` как «наследую от владельца», владелец шлёт своё значение даже
	 * тогда, когда у элемента есть собственное и результат не изменился.
	 */
	'change:closable': () => void
}

/**
 * Контракт item-адаптера таба.
 * Предоставляет геттер closable — резолвится из элемента ?? родительского расширения.
 */
export interface ITabsItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TTabsItemEventsExtension
> {
	/** Может ли таб быть закрыт. */
	readonly closable: boolean

	/** Закрыть таб. Делегирует в родительское расширение. */
	close(): void
}
