import { TValueControl } from '../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type {
	IRadioGroup,
	IRadioGroupProps,
	TRadioGroupEvents,
	TRadioGroupStates,
	TRadioGroupValue,
	TRadioGroupView,
} from './types'

/**
 * Группа радио — «один из N».
 *
 * `TValueControl`: значение группы — `value` отмеченного радио. Это не второе
 * состояние, а проекция активного элемента коллекции; связь в обе стороны
 * держит `TRadioGroupExtension`. Коллекция — на активации, а не на выборе:
 * отмеченное радио одно, и снять отметку, не выбрав другое, пользователь не
 * может.
 *
 * Сама группа знает о себе одно — она `radiogroup`. Имя ей даёт
 * `TAriaPlugin` (`aria_label`, `aria_labelledBy`). Клавиатуры у группы нет:
 * радио нативные, и стрелки, пропуск выключенных и одну остановку Tab браузер
 * даёт сам по общему `name`.
 *
 * `view`, `size` и `variant` задаются группе, а тема читает модификаторы с
 * каждого радио: контейнер стилей не имеет, и его радио могут стоять где
 * угодно в разметке. Раздаёт их элементам `TRadioGroupExtension`.
 */
export class TRadioGroup
	extends TValueControl<TRadioGroupValue, IRadioGroupProps, TRadioGroupEvents, TRadioGroupStates>
	implements IRadioGroup
{
	static override baseClass = 's-radio-group'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IRadioGroupProps, never, 'view'> = {
		...TValueControl.defaultValues,
		view: undefined,
	}

	protected _view: TRadioGroupView | undefined

	constructor(
		props: Partial<IRadioGroupProps> = {},
		options: IComponentOptions<TRadioGroupStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TRadioGroup

		this._aria.add('role', 'radiogroup')

		this._applyView(props.view ?? ctor.defaultValues.view)
	}

	get view(): TRadioGroupView | undefined {
		return this._view
	}

	set view(value: TRadioGroupView | undefined) {
		if (this._view === value) return

		this._applyView(value, this._view)
		this.events.emit('change:view', value)
	}

	/** Модификатор вида — с префиксом `--view-`; `swap` пропускает пустое значение. */
	protected _applyView(newValue: TRadioGroupView | undefined, oldValue?: TRadioGroupView): void {
		this._classes.swap({
			prefix: '--view-',
			oldValue,
			newValue,
		})

		this._view = newValue
	}

	override getProps(): IRadioGroupProps {
		return {
			...super.getProps(),
			view: this._view,
		}
	}
}
