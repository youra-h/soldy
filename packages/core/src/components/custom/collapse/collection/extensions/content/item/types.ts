import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'

export type TCollapseContentItemEventsExtension = TBaseItemEventsExtension

/**
 * Контракт item-адаптера связки «заголовок ↔ панель».
 *
 * Отдаёт обе стороны, потому что знает элемент: `aria-controls` заголовка и
 * `id` панели — один и тот же идентификатор, и считаться он обязан в одном
 * месте.
 */
export interface ICollapseContentItemExtension<TItem extends object = any>
	extends IItemExtension<TItem, TCollapseContentItemEventsExtension> {
	/** Атрибуты заголовка: `id`, ссылка на панель и состояние раскрытия. */
	readonly headerAria: TAriaAttributes
	/** Атрибуты панели: роль, `id` и ссылка на заголовок. */
	readonly contentAria: TAriaAttributes
}
