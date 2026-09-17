import { TControl } from '../../base/control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
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

	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<IAccordionProps, never, 'view'> = {
		...TControl.defaultValues,
		view: undefined,
	}

	protected _view: TAccordionView | undefined

	constructor(
		props: Partial<IAccordionProps> = {},
		options: IComponentOptions<TAccordionStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TAccordion

		this._applyView(props.view ?? ctor.defaultValues.view)
	}

	get view(): TAccordionView | undefined {
		return this._view
	}

	set view(value: TAccordionView | undefined) {
		if (this._view !== value) {
			this._applyView(value, this._view)
			this.events.emit('change:view', value)
		}
	}

	/** Модификатор вида — с префиксом `--view-`; `swap` пропускает пустое значение. */
	protected _applyView(newValue: TAccordionView | undefined, oldValue?: TAccordionView) {
		this._classes.swap({
			prefix: '--view-',
			oldValue,
			newValue,
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
