import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../base/component-view'
import type { TAriaAttributes } from '../../../common'

/**
 * Сторона и выравнивание подсказки у триггера.
 *
 * Те же четыре значения, что у плагина якоря (`anchor_placement`): их Tooltip
 * и отдаёт своему Frame. Тип у ядра свой — плагинов ядро не знает. Flip и
 * shift у края окна плагин якоря делает поверх выбора потребителя.
 */
export type TTooltipPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

export type TTooltipEvents = TComponentViewEvents & {
	/** change:open */
	'change:open': (value: boolean) => void
	/** change:placement */
	'change:placement': (value: TTooltipPlacement) => void
	/** change:openDelay */
	'change:openDelay': (value: number) => void
	/** change:closeDelay */
	'change:closeDelay': (value: number) => void
}

export interface ITooltipProps extends IComponentViewProps {
	/** Показана ли подсказка */
	open?: boolean
	/** Сторона и выравнивание подсказки у триггера */
	placement?: TTooltipPlacement
	/** Через сколько миллисекунд наведения подсказка показывается */
	openDelay?: number
	/** Через сколько миллисекунд после ухода курсора подсказка прячется */
	closeDelay?: number
}

export interface ITooltip extends IComponentView<ITooltipProps, TTooltipEvents> {
	/** Показана ли подсказка */
	open: boolean
	/** Сторона и выравнивание подсказки у триггера */
	placement: TTooltipPlacement
	/** Задержка показа при наведении, мс */
	openDelay: number
	/** Задержка скрытия после ухода курсора, мс */
	closeDelay: number
	/** ARIA триггера — второй стороны связки: `aria-describedby` на панель */
	readonly triggerAria: TAriaAttributes
}
