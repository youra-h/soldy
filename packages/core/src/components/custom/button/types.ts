import type {
	ITextable,
	ITextableProps,
	TTextableEvents,
	TTextableStates,
} from '../../base/textable'
import type { TComponentVariant, TThemeRegistry } from '../../../common'

/**
 * Реестр видов кнопки. Значения объявляет тема (см. `TThemeRegistry`).
 *
 * Один реестр на всё, что выглядит кнопкой: `view` у ListBox и Accordion —
 * псевдоним `TButtonView`, потому что вид списка и есть вид его строк, у Tags —
 * потому что пилюля тега и есть вид кнопки.
 */
export interface IButtonViews extends TThemeRegistry {}

export type TButtonView = Extract<keyof IButtonViews, string>

export interface IButtonProps extends ITextableProps {
	variant?: TComponentVariant
	/** Вид кнопки. Не задан — модификатора нет, и кнопка выглядит видом темы по умолчанию */
	view?: TButtonView
}

export type TButtonEvents = TTextableEvents & {
	'change:view': (value: TButtonView | undefined) => void
}

export type TButtonStates = TTextableStates

export interface IButton extends ITextable<IButtonProps, TButtonEvents> {
	view: TButtonView | undefined
}
