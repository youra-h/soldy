import type { IControl, IControlProps, TControlEvents } from '../control'
import type { TChangeEvent, TValuePayload } from '../../../common'

export type TTextableEvents = TControlEvents & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
}

export interface ITextableProps extends IControlProps {
	/** Отображаемый текст компонента (не путать с value у контролов). */
	text?: string
}

export interface ITextable<
	TProps extends ITextableProps = ITextableProps,
	TEvents extends Record<string, (...args: any) => any> = TTextableEvents,
> extends IControl<TProps, TEvents> {
	text: string
}
