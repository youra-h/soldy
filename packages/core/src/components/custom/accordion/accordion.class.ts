import { TControl } from '../../base/control'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common'
import type {
	IAccordion,
	IAccordionProps,
	TAccordionEvents,
	TAccordionStates,
	TAccordionView,
} from './types'

/**
 * Компонент Accordion (TAccordion).
 * Владеет только раскладкой (view). Коллекция создаётся отдельно через AccordionFactory
 * или через TCollectionExtension в adapter-слое.
 */
export class TAccordion
	extends TControl<IAccordionProps, TAccordionEvents, TAccordionStates>
	implements IAccordion
{
	static override baseClass = 's-accordion'

	static defaultValues: Partial<IAccordionProps> = {
		...TControl.defaultValues,
		view: 'plain',
		variant: 'normal',
	}

	protected _view!: TAccordionView

	constructor(
		props: Partial<IAccordionProps> = {},
		options: IComponentOptions<TAccordionStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TAccordion

		this._applyView(props.view ?? ctor.defaultValues.view!)
	}

	get view(): TAccordionView {
		return this._view
	}

	set view(value: TAccordionView) {
		if (this._view !== value) {
			this._applyView(value, this._view)
			;(this.events as TEvented<TAccordionEvents>).emit('change:view', value)
		}
	}

	protected _applyView(newValue: TAccordionView, oldValue?: TAccordionView) {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})
		this._view = newValue
	}

	override getProps(): IAccordionProps {
		return {
			...super.getProps(),
			view: this._view,
		}
	}
}
