import { TMenuGroup } from '../group/group.class'
import type { TDefaultValues } from '../../../base/component'
import type {
	IMenuRadioGroup,
	IMenuRadioGroupProps,
	TMenuRadioGroupEvents,
	TMenuRadioGroupValue,
} from './types'

/**
 * Группа переключателей меню (`Menu.RadioGroup`): «Сортировка» — «по имени»,
 * «по дате». В группе отмечен один переключатель, и нажатие другого переносит
 * отметку на него, не закрывая меню.
 *
 * Та же группа меню, что `Menu.Group`: подпись, её набор и `role="group"` с
 * именем от подписи — от базы. Роли `radiogroup` нет: в меню группа
 * переключателей — `group` (APG Menu). Своё у группы — значение (`value`):
 * `value` отмеченного переключателя.
 *
 * Значение — проекция выбора коллекции меню, а не второе состояние. Отметка
 * переключателя — выбор коллекции (режим `multiple`, как у флажка), а правило
 * «в группе отмечен один» и связь значения с отметкой в обе стороны держит
 * расширение меню (`TMenuExtension`). В коллекцию группа не входит: её
 * переключатели — пункты меню, и навигация ходит сквозь неё. Чья группа у
 * переключателя, тот знает сам (`TMenuRadioItem.group`).
 */
export class TMenuRadioGroup
	extends TMenuGroup<IMenuRadioGroupProps, TMenuRadioGroupEvents>
	implements IMenuRadioGroup
{
	static defaultValues: typeof TMenuGroup.defaultValues &
		TDefaultValues<IMenuRadioGroupProps, 'value'> = {
		...TMenuGroup.defaultValues,
		value: null,
	}

	protected _value: TMenuRadioGroupValue

	constructor(props: Partial<IMenuRadioGroupProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuRadioGroup

		this._value = props.value ?? ctor.defaultValues.value
	}

	/** Значение отмеченного переключателя; `null` — не отмечен ни один. */
	get value(): TMenuRadioGroupValue {
		return this._value
	}

	set value(value: TMenuRadioGroupValue) {
		if (this._value === value) return

		const oldValue = this._value

		this._value = value
		this.events.emit('change:value', { newValue: value, oldValue })
	}

	override getProps(): IMenuRadioGroupProps {
		return {
			...super.getProps(),
			value: this._value,
		}
	}
}
