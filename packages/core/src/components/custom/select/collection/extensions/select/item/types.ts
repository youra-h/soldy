import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { ISelectItem } from '../../../../item/types'
import type { TListIndicator } from '../../../../../list'

export type TSelectItemEventsExtension = TBaseItemEventsExtension & {
	'change:indicator': (value: TListIndicator) => void
}

/**
 * Контракт item-адаптера опции.
 *
 * Stateless-делегат: собственного состояния нет, всё берётся у родительского
 * расширения. Нужен, чтобы разметка могла спросить у опции её `id` — тот же,
 * на который ссылается `aria-activedescendant` поля.
 */
export interface ISelectItemExtension<
	TItem extends ISelectItem = ISelectItem,
> extends IItemExtension<TItem, TSelectItemEventsExtension> {
	/** `id` этой опции. */
	readonly optionId: string
	/** Где стоит отметка выбранного — значение поля целиком. */
	readonly indicator: TListIndicator
	/** Выбрать опцию с учётом режима и `closeOnSelect` владельца. */
	choose(): void
}
