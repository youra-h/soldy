import { TControl } from '../../base/control'
import type { IComponentViewOptions } from '../../base/component-view'
import { TComponentView } from '../../base/component-view'
import { TEvented } from '../../../common'
import type {
	ICollapse,
	ICollapseProps,
	TCollapseEvents,
	TCollapseStates,
	TCollapseView,
} from './types'

/**
 * Компонент Collapse (TCollapse).
 * Владеет только раскладкой (view). Коллекция создаётся отдельно через CollapseFactory
 * или через TCollectionExtension в adapter-слое.
 */
export class TCollapse
	extends TControl<ICollapseProps, TCollapseEvents, TCollapseStates>
	implements ICollapse
{
	static override baseClass = 's-collapse'

	static defaultValues: Partial<ICollapseProps> = {
		...TControl.defaultValues,
		view: 'plain',
		variant: 'normal',
	}

	protected _view!: TCollapseView

	constructor(
		options:
			| IComponentViewOptions<ICollapseProps, TCollapseStates>
			| Partial<ICollapseProps> = {},
	) {
		super(options)

		const ctor = new.target as typeof TCollapse
		const { props = {} } = TComponentView.prepareOptions<ICollapseProps, TCollapseStates>(
			options,
		)

		this._applyView(props.view ?? ctor.defaultValues.view!)
	}

	get view(): TCollapseView {
		return this._view
	}

	set view(value: TCollapseView) {
		if (this._view !== value) {
			this._applyView(value, this._view)
			;(this.events as TEvented<TCollapseEvents>).emit('change:view', value)
		}
	}

	protected _applyView(newValue: TCollapseView, oldValue?: TCollapseView) {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})
		this._view = newValue
	}

	override getProps(): ICollapseProps {
		return {
			...super.getProps(),
			view: this._view,
		}
	}
}
