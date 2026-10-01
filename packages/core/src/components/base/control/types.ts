import type { IStylable, IStylableProps, TStylableEvents } from '../stylable'
import type { TChangeEvent } from '../../../common'

export type TControlEvents = TStylableEvents & {
	'change:disabled': (value: boolean) => void
	/** Запись своего `disabled` — подправить или отменить (`TChangeEvent`) */
	'change:disabled:before': (e: TChangeEvent<boolean>) => void
	'change:focused': (value: boolean) => void
	/** Запись `focused` — подправить или отменить (`TChangeEvent`) */
	'change:focused:before': (e: TChangeEvent<boolean>) => void
}

export interface IControlProps extends IStylableProps {
	disabled?: boolean
	focused?: boolean
}

export interface IControl<
	TProps extends IControlProps = IControlProps,
	TEvents extends Record<string, (...args: any) => any> = TControlEvents,
> extends IStylable<TProps, TEvents> {
	disabled: boolean
	focused: boolean
}
