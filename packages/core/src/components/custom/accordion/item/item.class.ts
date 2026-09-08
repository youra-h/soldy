import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import { TStateUnit, TEvented } from '../../../../common'
import type { TValuePayload } from '../../../../common'
import type {
	IAccordionItem,
	IAccordionItemProps,
	TAccordionArrowPlacement,
	TAccordionItemEvents,
	TAccordionItemStates,
} from './types'

/**
 * Логика элемента Accordion (без коллекционной части).
 * Наследуется от TValueControl, где value — это ключ элемента.
 * Generic TProps позволяет передавать расширенные Props (например, IAccordionItemProps с selected).
 */
export default class TAccordionItem<
	TProps extends IAccordionItemProps = IAccordionItemProps,
	TEvents extends TAccordionItemEvents = TAccordionItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TAccordionItemStates>
	implements IAccordionItem<TProps, TEvents>
{
	static override baseClass = 's-accordion-item'

	static defaultValues: Partial<IAccordionItemProps> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		arrowPlacement: 'start',
		variant: 'normal',
		tag: 'button',
	}

	protected _arrowPlacement!: TAccordionArrowPlacement

	constructor(
		props: Partial<TProps> = {},
		options: IComponentOptions<TAccordionItemStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TAccordionItem

		// Type assertion: TProps extends IAccordionItemProps, поэтому props содержит text и arrowPlacement
		const customProps = props as Partial<IAccordionItemProps>

		// Инициализация state-объектов
		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text! })

		this._arrowPlacement = customProps.arrowPlacement ?? ctor.defaultValues.arrowPlacement!

		// Подписка на изменения state-объектов
		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			;(this.events as TEvented<TAccordionItemEvents>).emit('change:text', payload)
		})
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	get arrowPlacement(): TAccordionArrowPlacement {
		return this._arrowPlacement
	}

	set arrowPlacement(value: TAccordionArrowPlacement) {
		if (this._arrowPlacement !== value) {
			this._arrowPlacement = value
			;(this.events as TEvented<TAccordionItemEvents>).emit('change:arrowPlacement', value)
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
