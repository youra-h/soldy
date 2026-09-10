import { TValueControl } from '../value-control'
import type { IInputControlProps, TInputControlEvents, TInputControlStates } from './types'
import type { IComponentOptions } from '../component'
import { TEvented, NATIVE_REQUIRED_TAGS, NATIVE_READONLY_TAGS } from '../../../common'

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
	TStates extends TInputControlStates<TValue> = TInputControlStates<TValue>,
> extends TValueControl<TValue, TProps, TEvents> {
	static defaultValues: Partial<IInputControlProps<any>> = {
		...TValueControl.defaultValues,
		readonly: false,
		required: false,
		id: '',
	}

	protected _readonly!: boolean
	protected _required!: boolean
	protected _id!: string

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TInputControl

		// Простые свойства
		// this._readonly = props.readonly ?? (ctor.defaultValues.readonly as boolean)
		this._applyReadonly(props.readonly ?? (ctor.defaultValues.readonly as boolean))
		this._applyRequired(props.required ?? (ctor.defaultValues.required as boolean))

		this._id = props.id ?? (ctor.defaultValues.id as string)

		this.events.on('change:required', () => this._syncRequiredAria())
		this.events.on('change:readonly', () => {
			this._syncRequiredAria()
			this._syncReadonlyAria()
		})
		this.events.on('change:tag', () => {
			this._syncRequiredAria()
			this._syncReadonlyAria()
		})

		this._syncRequiredAria()
		this._syncReadonlyAria()
	}

	/**
	 * `id` элемента формы.
	 *
	 * Пустой проп означает «сгенерируй сам» — берётся `uid`, уникальный в
	 * рамках сессии. Задавать его снаружи нужно там, где на поле ссылаются:
	 * `<label for>`, `aria-labelledby`, `aria-describedby` у текста ошибки.
	 *
	 * Геттер всегда возвращает непустую строку, а `getProps()` отдаёт
	 * заданное значение как есть: иначе `assign()` перенёс бы чужой `uid` на
	 * другой экземпляр.
	 */
	get id(): string {
		return this._id || String(this.uid)
	}

	set id(value: string) {
		if (this._id === value) return

		this._id = value
		;(this.events as TEvented<TInputControlEvents<TValue>>).emit('change:id', this.id)
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
		;(this.events as TEvented<TInputControlEvents<TValue>>).emit('change:readonly', value)
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
		;(this.events as TEvented<TInputControlEvents<TValue>>).emit('change:required', value)
	}

	/**
	 * У тегов с собственным `required` состояние передаётся этим атрибутом.
	 * Исключение — поле, поставленное `readonly`: браузер такое поле не
	 * валидирует, нативный `required` на нём бессмыслен, и без явного
	 * `aria-required` состояние останется немым для скринридера.
	 *
	 * Зависит от `required`, `readonly` и `tag`, поэтому пересчитывается на
	 * все три события.
	 */
	protected _syncRequiredAria(): void {
		const nativeRequired =
			!this._readonly &&
			typeof this.tag === 'string' &&
			NATIVE_REQUIRED_TAGS.has(this.tag.toLowerCase())

		this._aria.add('aria-required', this._required && !nativeRequired ? 'true' : null)
	}

	/**
	 * Симметрично `_syncRequiredAria()`: у тегов с собственным `readonly`
	 * дублировать `aria-readonly` не нужно, у остальных это единственный
	 * способ сообщить о состоянии.
	 */
	protected _syncReadonlyAria(): void {
		const nativeReadonly =
			typeof this.tag === 'string' && NATIVE_READONLY_TAGS.has(this.tag.toLowerCase())

		this._aria.add('aria-readonly', this._readonly && !nativeReadonly ? 'true' : null)
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			readonly: this._readonly,
			required: this._required,
			id: this._id,
		} as TProps
	}
}
