import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'

export type TTabsItemEventsExtension = TBaseItemEventsExtension & {
	/**
	 * `closable` изменился — перечитайте геттер.
	 *
	 * Без аргумента намеренно, как `change:active` и `change:order` у базовых
	 * адаптеров. Геттер отдаёт `элемент ?? владелец`, а источников у значения
	 * два, и ни один не равен результату: элемент шлёт `undefined` как
	 * «наследую», владелец шлёт своё даже когда у элемента есть собственное и
	 * результат не изменился. Значение в аргументе было бы неверным.
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
