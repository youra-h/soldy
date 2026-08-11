import type { IItemExtension } from './types'

/**
 * Абстрактный item-адаптер — устраняет повторяющийся код конструктора:
 * `_item`, `_parent`.
 *
 * @template TItem   — тип элемента коллекции
 * @template TParent — тип родительского расширения
 */
export abstract class TBaseItemExtension<
	TItem extends object = any,
	TParent = any,
> implements IItemExtension<TItem> {
	constructor(
		protected readonly _item: TItem,
		protected readonly _parent: TParent,
	) {}
}
