import type { IStylable, IStylableProps, TStylableEvents } from '../../base/stylable'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { TAria, TAriaAttributes, TClasses, TDatasetAttributes } from '../../../common'
import type { IMenuCollectionProps } from './collection/types'
import type { IMenuItem, IMenuItemProps } from './item/types'

/**
 * Сторона и выравнивание панели у триггера.
 *
 * Четыре значения плагина якоря (`anchor_placement`) — по началу и концу
 * триггера, как у Popover: их меню и отдаёт своему Frame. Тип у ядра свой —
 * плагинов ядро не знает. Flip и shift у края окна плагин якоря делает поверх
 * выбора потребителя.
 */
export type TMenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

export type TMenuEvents = TStylableEvents &
	TCollectionStorageDriverEvents<IMenuItem> & {
		/** change:open */
		'change:open': (value: boolean) => void
		/** change:placement */
		'change:placement': (value: TMenuPlacement) => void
		/** change:triggerAria — набор атрибутов триггера изменился */
		'change:triggerAria': (value: TAriaAttributes) => void
		/** change:panelClasses — классы панели изменились */
		'change:panelClasses': (value: string[]) => void
	}

/** Пропсы самого меню (без коллекционной части). */
export interface IMenuComponentProps extends IStylableProps {
	/** Открыта ли панель */
	open?: boolean
	/** Сторона и выравнивание панели у триггера */
	placement?: TMenuPlacement
}

/** Полный набор пропсов Menu: свои и коллекции (`engine`, `items`, `trackBy`). */
export interface IMenuProps
	extends IMenuComponentProps, IMenuCollectionProps<IMenuItemProps, IMenuItem> {}

/**
 * Меню действий у кнопки (APG Menu Button): триггер потребителя и панель с
 * пунктами.
 */
export interface IMenu extends IStylable<IMenuProps, TMenuEvents> {
	/** Открыта ли панель */
	open: boolean
	/** Сторона и выравнивание панели у триггера */
	placement: TMenuPlacement
	/**
	 * ARIA триггера — второй стороны связки «кнопка ↔ меню»: `aria-haspopup`,
	 * `aria-expanded`; `id` и `aria-controls` пишет плагин связок
	 */
	readonly triggerAria: TAria
	/** `data-*` триггера для темы: открытый триггер выглядит нажатым */
	readonly triggerDataset: TDatasetAttributes
	/**
	 * Классы панели: размер и вариант меню модификаторами блока панели — до
	 * телепортированной панели модификаторы корня не доходят
	 */
	readonly panelClasses: TClasses
}
