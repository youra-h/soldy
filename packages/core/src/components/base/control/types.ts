import type { IStylable, IStylableProps, TStylableEvents, TStylableStates } from '../stylable'
import type { IStateUnit } from '../../../common'

export type TControlEvents = TStylableEvents & {
	/** Сменилось своё `disabled` — то, что записали разметка, данные или код. */
	'change:disabled': (value: boolean) => void
	/** Сменился итог `resolvedDisabled`. */
	'change:disabled:resolved': (value: boolean) => void
	'change:focused': (value: boolean) => void
}

export interface IControlProps extends IStylableProps {
	disabled?: boolean
	focused?: boolean
}

export type TControlStates = TStylableStates & {
	disabled: IStateUnit<boolean>
	focused: IStateUnit<boolean>
}

/**
 * Элемент, чьё «выключено» сочетается с владельцем (`bindDisabledToOwner`).
 *
 * Правилу нужна единица состояния, а не свойство: своё значение лежит в её
 * `rawValue`, итог отдаёт резольвер.
 */
export interface IDisabledItem {
	readonly states: Pick<TControlStates, 'disabled'>
}

/**
 * Владелец, чьё «выключено» распространяется на его элементы.
 *
 * Элементы наследуют итог владельца, а не своё его значение: правило одно —
 * всё, что решает, доступен ли контрол, читает итог.
 */
export interface IDisabledOwner {
	readonly resolvedDisabled: boolean
}

export interface IControl<
	TProps extends IControlProps = IControlProps,
	TEvents extends Record<string, (...args: any) => any> = TControlEvents,
	TStates extends TControlStates = TControlStates,
> extends IStylable<TProps, TEvents, TStates> {
	/**
	 * Своё значение — вход и модель: то, что записали разметка, данные или
	 * код. Выключенный владелец его не меняет, как `input.disabled` под
	 * `<fieldset disabled>`.
	 */
	disabled: boolean
	/**
	 * Итог: у элемента коллекции — своё **или** владельца, у остальных — своё.
	 * По нему контрол доступен или нет — разметка, клавиатура, плагины.
	 */
	readonly resolvedDisabled: boolean
	focused: boolean
}
