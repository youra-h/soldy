import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { IAccordionCollectionItemProps } from '../collection/types'

export type TAccordionArrowPlacement = 'start' | 'end'

export type TAccordionItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
	/** change:arrowPlacement */
	'change:arrowPlacement': (value: TAccordionArrowPlacement) => void
}

export interface IAccordionItemProps
	extends IValueControlProps<string | number>, IAccordionCollectionItemProps {
	/** Текст заголовка элемента */
	text?: string
	/** Позиция иконки-стрелки */
	arrowPlacement?: TAccordionArrowPlacement
}

export interface IAccordionItem<
	TProps extends IAccordionItemProps = IAccordionItemProps,
	TEvents extends TAccordionItemEvents = TAccordionItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст заголовка элемента */
	text: string
	/** Позиция иконки-стрелки */
	arrowPlacement: TAccordionArrowPlacement
}

export type TAccordionItemOptions = IComponentOptions
