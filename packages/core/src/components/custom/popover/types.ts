import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../base/component-view'
import type { TAriaAttributes, TDatasetAttributes } from '../../../common'

/**
 * Сторона и выравнивание панели у триггера.
 *
 * Четыре значения плагина якоря (`anchor_placement`) — по началу и концу
 * триггера: их Popover и отдаёт своему Frame. Центра (`top`, `bottom`) у
 * поповера нет — его потребитель пока только подсказка. Тип у ядра свой —
 * плагинов ядро не знает. Flip и shift у края окна плагин якоря делает поверх
 * выбора потребителя.
 */
export type TPopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

export type TPopoverEvents = TComponentViewEvents & {
	/** change:open */
	'change:open': (value: boolean) => void
	/** change:closable */
	'change:closable': (value: boolean) => void
	/** change:closeLabel */
	'change:closeLabel': (value: string) => void
	/** change:lazyMount */
	'change:lazyMount': (value: boolean) => void
	/** change:placement */
	'change:placement': (value: TPopoverPlacement) => void
}

export interface IPopoverProps extends IComponentViewProps {
	/** Открыта ли панель */
	open?: boolean
	/** Показывать ли кнопку закрытия в углу панели */
	closable?: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel?: string
	/**
	 * Не монтировать содержимое, пока панель ни разу не открывали. После
	 * первого открытия содержимое остаётся, закрытие только прячет панель.
	 */
	lazyMount?: boolean
	/** Сторона и выравнивание панели у триггера */
	placement?: TPopoverPlacement
}

export interface IPopover extends IComponentView<IPopoverProps, TPopoverEvents> {
	/** Открыта ли панель */
	open: boolean
	/** Показывать ли кнопку закрытия в углу панели */
	closable: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel: string
	/** Не монтировать содержимое до первого открытия */
	lazyMount: boolean
	/** Сторона и выравнивание панели у триггера */
	placement: TPopoverPlacement
	/**
	 * ARIA триггера — второй стороны связки «триггер ↔ панель»:
	 * `aria-haspopup`, `aria-expanded`, `aria-controls`
	 */
	readonly triggerAria: TAriaAttributes
	/** `data-*` триггера для темы: открытый триггер выглядит нажатым */
	readonly triggerDataset: TDatasetAttributes
	/** Имя кнопки закрытия: `closeLabel` */
	readonly closeAria: TAriaAttributes
	/** Смонтировано ли содержимое панели: без `lazyMount` — всегда */
	readonly contentRendered: boolean
}
