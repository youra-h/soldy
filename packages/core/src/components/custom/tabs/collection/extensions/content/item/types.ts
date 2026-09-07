import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'

export type TTabsContentItemEventsExtension = TBaseItemEventsExtension

/**
 * Контракт item-адаптера связки «таб ↔ панель».
 *
 * Отдаёт обе стороны, потому что знает элемент: `aria-controls` таба и
 * `id` панели — это один и тот же идентификатор, и считаться он обязан в
 * одном месте.
 */
export interface ITabsContentItemExtension<TItem extends object = any>
	extends IItemExtension<TItem, TTabsContentItemEventsExtension> {
	/** Атрибуты стороны таба: `id` и ссылка на панель. */
	readonly tabAria: TAriaAttributes
	/** Атрибуты стороны панели: роль, `id` и ссылка на таб. */
	readonly panelAria: TAriaAttributes
}
