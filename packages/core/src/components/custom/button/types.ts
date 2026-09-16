import type {
	ITextable,
	ITextableProps,
	TTextableEvents,
	TTextableStates,
} from '../../base/textable'
import type { TComponentVariant } from '../../../common'

export type TButtonView = 'filled' | 'plain' | 'outlined' | 'none'

export interface IButtonProps extends ITextableProps {
	variant?: TComponentVariant
	view?: TButtonView
	/**
	 * Кнопка только рисует строку чужого элемента и сама себя скринридеру не
	 * объявляет: ни `role`, ни `tabindex`, ни `aria-disabled`.
	 */
	presentational?: boolean
}

export type TButtonEvents = TTextableEvents & {
	'change:view': (value: TButtonView) => void
	'change:presentational': (value: boolean) => void
}

export type TButtonStates = TTextableStates

export interface IButton extends ITextable<IButtonProps, TButtonEvents> {
	view: TButtonView
	presentational: boolean
}
