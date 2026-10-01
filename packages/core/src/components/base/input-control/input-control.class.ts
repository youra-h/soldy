import { TValueControl } from '../value-control'
import type { IInputControlProps, TInputControlEvents } from './types'
import type { TDefaultValues } from '../component'
import type { TEventSink } from '../../../common'

/**
 * База для input-элементов (текстовые поля, checkbox, switch и т.д.).
 *
 * Наследует:
 * - интерактивность (disabled/focused)
 * - значение `value` (commit + input)
 * - name
 */
export default class TInputControl<
	TValue = string,
	TProps extends IInputControlProps<TValue> = IInputControlProps<TValue>,
	TEvents extends TInputControlEvents<TValue> = TInputControlEvents<TValue>,
> extends TValueControl<TValue, TProps, TEvents> {
	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IInputControlProps<any>, 'readonly' | 'required', 'id'> = {
		...TValueControl.defaultValues,
		readonly: false,
		required: false,
		id: undefined,
	}

	protected _readonly!: boolean
	protected _required!: boolean
	protected _id: string | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TInputControl

		// Простые свойства
		// this._readonly = props.readonly ?? ctor.defaultValues.readonly
		this._applyReadonly(props.readonly ?? ctor.defaultValues.readonly)
		this._applyRequired(props.required ?? ctor.defaultValues.required)

		this._id = props.id ?? ctor.defaultValues.id

		this.events.on('change:required', () => this._syncInputAccessibility())
		this.events.on('change:readonly', () => this._syncInputAccessibility())
		this.events.on('change:tag', () => this._syncInputAccessibility())

		this._syncInputAccessibility()
	}

	/**
	 * `id` элемента формы — значение потребителя: задают его там, где на поле
	 * ссылается его разметка (`<label for>`, `aria-labelledby`). Не задан —
	 * атрибута нет: своих ссылок на поле у библиотеки нет.
	 */
	get id(): string | undefined {
		return this._id
	}

	set id(value: string | undefined) {
		if (this._id === value) return

		this._id = value
		this._sink.emit('change:id', value)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TInputControlEvents<TValue>> {
		return this.events
	}

	get readonly(): boolean {
		return this._readonly
	}

	protected _applyReadonly(value: boolean) {
		this._classes.toggle(`--readonly`, value)

		this._readonly = value
	}

	set readonly(value: boolean) {
		if (this._readonly === value) return

		this._applyReadonly(value)
		this._sink.emit('change:readonly', value)
	}

	get required(): boolean {
		return this._required
	}

	protected _applyRequired(value: boolean) {
		this._classes.toggle(`--required`, value)

		this._required = value
	}

	set required(value: boolean) {
		if (this._required === value) return

		this._applyRequired(value)
		this._sink.emit('change:required', value)
	}

	/**
	 * Хук конкретного контрола.
	 *
	 * База знает только семантическое состояние — `required` и `readonly`.
	 * Как оно выражается в ARIA (нужен ли `aria-required`/`aria-readonly`
	 * рядом с нативным атрибутом тега или вместо него) — решает наследник,
	 * который знает, во что он реально рендерится: `TInput`, `TSelect`,
	 * `TCheckBox`, `TSwitch`. `TInputControl` ни во что конкретное не
	 * рендерится, поэтому по умолчанию ничего не делает.
	 */
	protected _syncInputAccessibility(): void {}

	getProps(): TProps {
		return {
			...super.getProps(),
			readonly: this._readonly,
			required: this._required,
			id: this._id,
		} as TProps
	}
}
