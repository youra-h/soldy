import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../base/collection'
import type { TCollapseView } from '../../../types'

export type TCollapseItemEventsExtension = TBaseItemEventsExtension & {
	'change:view': (value: TCollapseView) => void
}

/**
 * Контракт item-адаптера collapse.
 * Предоставляет геттер view — резолвится из родительского расширения (TCollapse).
 */
export interface ICollapseItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TCollapseItemEventsExtension
> {
	/** Внешний вид элемента (наследуется от TCollapse). */
	readonly view: TCollapseView
}
