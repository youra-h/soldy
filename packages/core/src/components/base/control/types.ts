import type { IStylable, IStylableProps, TStylableEvents } from '../stylable'
import type { TChangeEvent } from '../../../common'

export type TControlEvents = TStylableEvents & {
	'change:disabled': (value: boolean) => void
	/** Запись своего `disabled` — подправить или отменить (`TChangeEvent`) */
	'change:disabled:before': (e: TChangeEvent<boolean>) => void
	'change:focused': (value: boolean) => void
	/** Запись `focused` — подправить или отменить (`TChangeEvent`) */
	'change:focused:before': (e: TChangeEvent<boolean>) => void
	/**
	 * change:labelable — элемент с `aria` стал или перестал быть labelable: у
	 * `aria` на корне — сменился тег, у ползунка — число ручек. По нему поле
	 * формы `Field` переводит подпись между `for` и ссылкой
	 */
	'change:labelable': (value: boolean) => void
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
	/**
	 * Labelable ли элемент с `aria`: подпись называет его `for`, а не ссылкой
	 * `aria-labelledby`, как группу. Сменился — `change:labelable`
	 */
	readonly labelable: boolean
}
