import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import { TStateUnit, TEvented } from '../../../../common'
import type { TValuePayload } from '../../../../common'
import type { IListItem, IListItemProps, TListItemEvents, TListItemStates } from './types'

/**
 * Логика элемента списка (без коллекционной части).
 * Наследуется от TValueControl, где value — это ключ элемента.
 * Generic TProps позволяет передавать расширенные Props (например, IListItemProps с selected).
 */
export default class TListItem<
	TProps extends IListItemProps = IListItemProps,
	TEvents extends TListItemEvents = TListItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TListItemStates>
	implements IListItem<TProps, TEvents>
{
	static override baseClass = 's-list-item'

	static defaultValues: Partial<IListItemProps> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		wordWrap: undefined,
		variant: 'normal',
		tag: 'div',
	}

	protected _wordWrap: boolean | undefined

	constructor(
		props: Partial<TProps> = {},
		options: IComponentOptions<TListItemStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TListItem

		// Type assertion: TProps extends IListItemProps, поэтому props содержит text и wordWrap
		const customProps = props as Partial<IListItemProps>

		// Инициализация state-объектов
		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text! })

		this._wordWrap = customProps.wordWrap ?? ctor.defaultValues.wordWrap

		// Подписка на изменения state-объектов
		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			;(this.events as TEvented<TListItemEvents>).emit('change:text', payload)
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
		;(this.events as TEvented<TListItemEvents>).emit('change:wordWrap', !!value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			wordWrap: this.wordWrap,
		} as TProps
	}
}

