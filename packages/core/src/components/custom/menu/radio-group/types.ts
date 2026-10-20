import type { IItemGroup, IItemGroupProps, TItemGroupEvents } from '../../../base/item-group'
import type { TValuePayload } from '../../../../common'

/**
 * Значение группы переключателей — `value` отмеченного переключателя; `null` —
 * не отмечен ни один.
 *
 * Не отдельное состояние, а проекция выбора коллекции меню: связь в обе
 * стороны держит расширение меню (`TMenuExtension`).
 */
export type TMenuRadioGroupValue = string | number | null

export type TMenuRadioGroupEvents = TItemGroupEvents & {
	/** change:value — отмечен другой переключатель группы или ни один */
	'change:value': (payload: TValuePayload<TMenuRadioGroupValue>) => void
}

export interface IMenuRadioGroupProps extends IItemGroupProps {
	/** Значение отмеченного переключателя; `null` — не отмечен ни один */
	value?: TMenuRadioGroupValue
}

/**
 * Группа переключателей меню (`Menu.RadioGroup`): «Сортировка» — «по имени»,
 * «по дате». Та же группа меню с подписью, что `Menu.Group`, и своё значение.
 */
export interface IMenuRadioGroup extends IItemGroup<IMenuRadioGroupProps, TMenuRadioGroupEvents> {
	/** Значение отмеченного переключателя; `null` — не отмечен ни один */
	value: TMenuRadioGroupValue
}
