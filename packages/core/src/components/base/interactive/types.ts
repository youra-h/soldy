import type { IComponentView, IComponentViewProps, TComponentViewEvents } from '../component-view'
import type { TChangeEvent } from '../../../common'

export type TInteractiveEvents = TComponentViewEvents & {
	/** change:disabled */
	'change:disabled': (value: boolean) => void
	/** Запись `disabled` — подправить или отменить (`TChangeEvent`) */
	'change:disabled:before': (e: TChangeEvent<boolean>) => void
	/** change:focused */
	'change:focused': (value: boolean) => void
	/** Запись `focused` — подправить или отменить (`TChangeEvent`) */
	'change:focused:before': (e: TChangeEvent<boolean>) => void
}

export interface IInteractiveProps extends IComponentViewProps {
	disabled?: boolean
	focused?: boolean
}

export interface IInteractive<
	TProps extends IInteractiveProps = IInteractiveProps,
	TEvents extends Record<string, (...args: any) => any> = TInteractiveEvents,
> extends IComponentView<TProps, TEvents> {
	disabled: boolean
	focused: boolean
}
