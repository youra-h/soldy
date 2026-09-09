import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import { TStateUnit, TEvented } from '../../../../common'
import type { TValuePayload } from '../../../../common'
import type {
	IListBoxItem,
	IListBoxItemProps,
	TListBoxItemEvents,
	TListBoxItemStates,
} from './types'

/**
 * Элемент списка.
 *
 * `TValueControl`, где `value` — ключ элемента: по нему коллекция и находит,
 * что выбрать, когда списку задали значение.
 *
 * `wordWrap` здесь трёхзначен: `undefined` означает «взять у списка», и это не
 * то же самое, что `false`. Разрешение делает item-адаптер коллекции.
 */
export default class TListBoxItem<
	TProps extends IListBoxItemProps = IListBoxItemProps,
	TEvents extends TListBoxItemEvents = TListBoxItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TListBoxItemStates>
	implements IListBoxItem<TProps, TEvents>
{
	static override baseClass = 's-list-box-item'

	static defaultValues: Partial<IListBoxItemProps> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		wordWrap: undefined,
		variant: 'normal',
		tag: 'div',
	}

	protected _wordWrap: boolean | undefined

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TListBoxItemStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TListBoxItem
		const customProps = props as Partial<IListBoxItemProps>

		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text! })

		this._wordWrap = customProps.wordWrap ?? ctor.defaultValues.wordWrap

		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			;(this.events as TEvented<TListBoxItemEvents>).emit('change:text', payload)
		})
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	get wordWrap(): boolean | undefined {
		return this._wordWrap
	}

	set wordWrap(value: boolean | undefined) {
		if (this._wordWrap === value) return

		this._wordWrap = value
		;(this.events as TEvented<TListBoxItemEvents>).emit('change:wordWrap', !!value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			wordWrap: this.wordWrap,
		} as TProps
	}
}
