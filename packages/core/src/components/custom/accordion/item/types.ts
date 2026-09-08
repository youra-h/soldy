import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { IAccordionCollectionItemProps } from '../collection/types'

export type TAccordionArrowPlacement = 'start' | 'end'

export type TAccordionItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
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

export type TAccordionItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
}

export interface IAccordionItem<
	TProps extends IAccordionItemProps = IAccordionItemProps,
	TEvents extends TAccordionItemEvents = TAccordionItemEvents,
	TStates extends TAccordionItemStates = TAccordionItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст заголовка элемента */
	text: string
	/** Позиция иконки-стрелки */
	arrowPlacement: TAccordionArrowPlacement
}

export type TAccordionItemOptions = IComponentOptions<TAccordionItemStates>
