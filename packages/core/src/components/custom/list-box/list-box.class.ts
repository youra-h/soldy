import { TList } from '../list'
import type { IListComponentProps } from '../list/types'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common'
import type { IListBoxProps, TListBoxView, TListBoxEvents, TListBoxStates, IListBox } from './types'

/**
 * Компонент ListBox (TListBox).
 * Наследует TList (maxRows, autoWidth, wordWrap, scrollBehavior) и добавляет view.
 */
export class TListBox
	extends TList<IListBoxProps, TListBoxEvents, TListBoxStates>
	implements IListBox
{
	static override baseClass = 's-list-box'

	static defaultValues: Partial<IListComponentProps & { view?: TListBoxView }> = {
		...TList.defaultValues,
		view: 'plain',
	}

	protected _view!: TListBoxView

	constructor(
		props: Partial<IListBoxProps> = {},
		options: IComponentOptions<TListBoxStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TListBox

		this._applyView(props.view ?? ctor.defaultValues.view!)
	}

	get view(): TListBoxView {
		return this._view
	}

	set view(value: TListBoxView) {
		if (this._view !== value) {
			this._applyView(value, this._view)
			;(this.events as TEvented<TListBoxEvents>).emit('change:view', value)
		}
	}

	protected _applyView(newValue: TListBoxView, oldValue?: TListBoxView) {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})
		this._view = newValue
	}

	override getProps(): IListBoxProps {
		return {
			...super.getProps(),
			view: this._view,
		} as IListBoxProps
	}
}
