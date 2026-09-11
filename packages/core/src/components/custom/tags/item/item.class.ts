import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import { TStateUnit, TEvented } from '../../../../common'
import type { TValuePayload, TAriaAttributes } from '../../../../common'
import type { ITagsItem, ITagsItemProps, TTagsItemEvents, TTagsItemStates } from './types'

/**
 * Элемент Tags — тег.
 *
 * `TValueControl`, где `value` — ключ тега: по нему коллекция находит, что
 * выделить, когда набору задали значение.
 *
 * Закрытие — копия `TTabsItem`: явное значение элемента приоритетнее
 * глобального `closable` компонента, и `disabled`-тег закрыть нельзя — при
 * переходе в `disabled` `closable` сбрасывается в `false`.
 */
export default class TTagsItem<
	TProps extends ITagsItemProps = ITagsItemProps,
	TEvents extends TTagsItemEvents = TTagsItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TTagsItemStates>
	implements ITagsItem<TProps, TEvents>
{
	static override baseClass = 's-tags-item'

	static defaultValues: Partial<ITagsItemProps> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		closable: undefined,
		closeLabel: 'Close',
		variant: 'normal',
		tag: 'div',
	}

	protected _closeLabel!: string

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TTagsItemStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTagsItem
		const customProps = props as Partial<ITagsItemProps>

		this._closeLabel = customProps.closeLabel ?? ctor.defaultValues.closeLabel!

		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text! })

		this._states.closable =
			options.states?.closable ??
			new TStateUnit<boolean | undefined>({
				initial: customProps.closable ?? ctor.defaultValues.closable,
			})

		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			;(this.events as TEvented<TTagsItemEvents>).emit('change:text', payload)
		})

		this._states.closable.events.on('change', (payload: TValuePayload<boolean | undefined>) => {
			this._classes.toggle(`--closable`, !!payload.newValue)
			;(this.events as TEvented<TTagsItemEvents>).emit('change:closable', payload.newValue)
		})

		this._classes.toggle(`--closable`, !!this._states.closable.value)

		// Только то, что тег знает о себе сам: он — элемент набора. Роль
		// меняется на `option`, когда у коллекции включён выбор — об этом
		// знает `TTagsExtension`, не элемент.
		this._aria.add('role', 'listitem')

		this.events.on('change:disabled', () => {
			if (this.disabled) {
				this._states.closable.value = false
			} else {
				this._states.closable.value = customProps.closable ?? ctor.defaultValues.closable
			}
		})
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	get closable(): boolean | undefined {
		return this._states.closable.value
	}

	set closable(value: boolean | undefined) {
		if (this._states.closable.rawValue === value || this.disabled) return

		this._states.closable.value = value
	}

	/**
	 * Слово для кнопки закрытия. Дефолт английский — язык интерфейса ядру
	 * неизвестен, а промолчать нельзя: кнопка останется без имени.
	 */
	get closeLabel(): string {
		return this._closeLabel
	}

	set closeLabel(value: string) {
		if (this._closeLabel === value) return

		this._closeLabel = value
		;(this.events as TEvented<TTagsItemEvents>).emit('change:closeLabel', value)
	}

	/**
	 * Имя кнопки закрытия — вместе с текстом тега: «Close Настройки». Без
	 * текста все кнопки набора назывались бы одинаково.
	 */
	get closeAria(): TAriaAttributes {
		const text = this.text.trim()

		return { 'aria-label': text ? `${this._closeLabel} ${text}` : this._closeLabel }
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			closable: this.closable,
			closeLabel: this._closeLabel,
		} as TProps
	}
}
