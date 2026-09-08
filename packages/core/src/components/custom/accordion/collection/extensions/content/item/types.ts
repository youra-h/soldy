import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'

export type TAccordionContentItemEventsExtension = TBaseItemEventsExtension

/**
 * Контракт item-адаптера связки «заголовок ↔ панель».
 *
 * Отдаёт обе стороны, потому что знает элемент: `aria-controls` заголовка и
 * `id` панели — один и тот же идентификатор, и считаться он обязан в одном
 * месте.
 */
export interface IAccordionContentItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TAccordionContentItemEventsExtension
> {
	/** Атрибуты заголовка: `id`, ссылка на панель и состояние раскрытия. */
	readonly headerAria: TAriaAttributes
	/** Атрибуты панели: роль, `id` и ссылка на заголовок. */
	readonly contentAria: TAriaAttributes
}
