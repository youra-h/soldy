import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TTagsView } from '../../../../types'

export type TTagsItemEventsExtension = TBaseItemEventsExtension & {
	'change:closable': (value: boolean) => void
	'change:view': (value: TTagsView) => void
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
	readonly view: TTagsView

	/** Закрыть тег. Делегирует в родительское расширение. */
	close(): void
}
