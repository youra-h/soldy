import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import { TStateUnit, TEvented } from '../../../../common'
import type { TValuePayload } from '../../../../common'
import type {
	ICollapseItem,
	ICollapseItemProps,
	TCollapseArrowPlacement,
	TCollapseItemEvents,
	TCollapseItemStates,
} from './types'

/**
 * Логика элемента Collapse (без коллекционной части).
 * Наследуется от TValueControl, где value — это ключ элемента.
 * Generic TProps позволяет передавать расширенные Props (например, ICollapseItemProps с selected).
 */
export default class TCollapseItem<
	TProps extends ICollapseItemProps = ICollapseItemProps,
	TEvents extends TCollapseItemEvents = TCollapseItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TCollapseItemStates>
	implements ICollapseItem<TProps, TEvents>
{
	static override baseClass = 's-collapse-item'

	static defaultValues: Partial<ICollapseItemProps> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		arrowPlacement: 'start',
		variant: 'normal',
		tag: 'button',
	}

	protected _arrowPlacement!: TCollapseArrowPlacement

	constructor(
		props: Partial<TProps> = {},
		options: IComponentOptions<TCollapseItemStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TCollapseItem

		// Type assertion: TProps extends ICollapseItemProps, поэтому props содержит text и arrowPlacement
		const customProps = props as Partial<ICollapseItemProps>

		// Инициализация state-объектов
		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text! })

		this._arrowPlacement = customProps.arrowPlacement ?? ctor.defaultValues.arrowPlacement!

		// Подписка на изменения state-объектов
		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			;(this.events as TEvented<TCollapseItemEvents>).emit('change:text', payload)
		})
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	get arrowPlacement(): TCollapseArrowPlacement {
		return this._arrowPlacement
	}

	set arrowPlacement(value: TCollapseArrowPlacement) {
		if (this._arrowPlacement !== value) {
			this._arrowPlacement = value
			;(this.events as TEvented<TCollapseItemEvents>).emit('change:arrowPlacement', value)
		}
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			arrowPlacement: this._arrowPlacement,
		} as TProps
	}
}
