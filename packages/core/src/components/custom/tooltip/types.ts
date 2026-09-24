import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../base/component-view'
import type { TAriaAttributes } from '../../../common'

/**
 * Сторона и выравнивание подсказки у триггера.
 *
 * Те же шесть значений, что у плагина якоря (`anchor_placement`): их Tooltip
 * и отдаёт своему Frame. `-start` и `-end` — по началу и концу триггера,
 * значение без суффикса (`top`, `bottom`) — по центру. Тип у ядра свой —
 * плагинов ядро не знает. Flip и shift у края окна плагин якоря делает поверх
 * выбора потребителя.
 */
export type TTooltipPlacement =
	| 'bottom-start'
	| 'bottom'
	| 'bottom-end'
	| 'top-start'
	| 'top'
	| 'top-end'

/**
 * Чем подсказка служит триггеру — как `type` у Tooltip GitHub Primer.
 *
 * - `description` — описанием: триггер ссылается на панель
 *   `aria-describedby`, имя у него своё (текст, `aria_label`);
 * - `label` — именем: триггер ссылается на панель `aria-labelledby`. Для
 *   элемента без видимого текста — кнопки-иконки: её имя и есть текст
 *   подсказки, и `aria_label` рядом с ним не нужен — иначе скринридер
 *   произнёс бы один текст дважды.
 *
 * Значение читает ядро — от него зависит `triggerAria`, — поэтому это union
 * ядра, а не реестр темы.
 */
export type TTooltipType = 'description' | 'label'

export type TTooltipEvents = TComponentViewEvents & {
	/** change:open */
	'change:open': (value: boolean) => void
	/** change:placement */
	'change:placement': (value: TTooltipPlacement) => void
	/** change:openDelay */
	'change:openDelay': (value: number) => void
	/** change:closeDelay */
	'change:closeDelay': (value: number) => void
	/** change:type */
	'change:type': (value: TTooltipType) => void
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
	/** Чем подсказка служит триггеру: описанием или именем */
	type?: TTooltipType
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
	/** Чем подсказка служит триггеру: описанием или именем */
	type: TTooltipType
	/**
	 * ARIA триггера — второй стороны связки: ссылка на панель,
	 * `aria-describedby` или, в режиме `label`, `aria-labelledby`
	 */
	readonly triggerAria: TAriaAttributes
}
