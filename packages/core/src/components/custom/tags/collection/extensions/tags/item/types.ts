import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TTagsView } from '../../../../types'

export type TTagsItemEventsExtension = TBaseItemEventsExtension & {
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
	'change:view': (value: TTagsView | undefined) => void
}

/**
 * Контракт item-адаптера тега.
 * Предоставляет геттер closable — резолвится из элемента ?? родительского расширения.
 * `view` — со набора целиком, элемент своего не имеет (как у ListBox).
 */
export interface ITagsItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TTagsItemEventsExtension
> {
	/** Может ли тег быть закрыт. */
	readonly closable: boolean

	/** Внешний вид тега — берётся у владельца целиком. */
	readonly view: TTagsView | undefined

	/** Закрыть тег. Делегирует в родительское расширение. */
	close(): void
}
