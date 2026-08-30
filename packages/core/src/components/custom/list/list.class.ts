import { TControl } from '../../base/control'
import type { IComponentViewOptions } from '../../base/component-view'
import { TComponentView } from '../../base/component-view'
import { TEvented } from '../../../common'
import type { TScrollBehavior } from '../../../common'
import type { IList, IListComponentProps, IListProps, TListEvents, TListStates } from './types'

/**
 * Компонент списка (TList).
 * Headless-модель: владеет только раскладкой (maxRows, autoWidth, wordWrap, scrollBehavior).
 * Коллекция создаётся отдельно через ListFactory или через TCollectionExtension в adapter-слое.
 */
export class TList<
	TProps extends IListComponentProps = IListProps,
	TEvents extends TListEvents = TListEvents,
	TStates extends TListStates = TListStates,
>
	extends TControl<TProps, TEvents, TStates>
	implements IList<TProps, TEvents, TStates>
{
	static override baseClass = 's-list'

	static defaultValues: Partial<IListComponentProps> = {
		...TControl.defaultValues,
		maxRows: 0,
		autoWidth: false,
		wordWrap: false,
		scrollBehavior: 'smooth',
	}

	protected _maxRows: number
	protected _autoWidth!: boolean
	protected _wordWrap!: boolean
	protected _scrollBehavior: TScrollBehavior

	constructor(options: IComponentViewOptions<TProps, TStates> | Partial<TProps> = {}) {
		super(options)

		const ctor = new.target as typeof TList

		const { props = {} as Partial<TProps> } = TComponentView.prepareOptions<TProps, TStates>(
			options,
		)

		this._maxRows = props.maxRows ?? ctor.defaultValues.maxRows!
		this._applyAutoWidth(props.autoWidth ?? ctor.defaultValues.autoWidth!)
		this._applyWordWrap(props.wordWrap ?? ctor.defaultValues.wordWrap!)
		this._scrollBehavior = props.scrollBehavior ?? ctor.defaultValues.scrollBehavior!
	}

	get maxRows(): number {
		return this._maxRows
	}

	set maxRows(value: number) {
		if (this._maxRows !== value) {
			this._maxRows = value
			;(this.events as TEvented<TListEvents>).emit('change:maxRows', value)
		}
	}

	get autoWidth(): boolean {
		return this._autoWidth
	}

	protected _applyAutoWidth(newValue: boolean) {
		this._classes.toggle('--auto-width', newValue)
		this._autoWidth = newValue
	}

	set autoWidth(value: boolean) {
		if (this._autoWidth !== value) {
			this._applyAutoWidth(value)
			;(this.events as TEvented<TListEvents>).emit('change:autoWidth', value)
		}
	}

	get wordWrap(): boolean {
		return this._wordWrap
	}

	protected _applyWordWrap(newValue: boolean) {
		this._classes.toggle('--word-wrap', newValue)
		this._wordWrap = newValue
	}

	set wordWrap(value: boolean) {
		if (this._wordWrap !== value) {
			this._applyWordWrap(value)
			;(this.events as TEvented<TListEvents>).emit('change:wordWrap', value)
		}
	}

	get scrollBehavior(): TScrollBehavior {
		return this._scrollBehavior
	}

	set scrollBehavior(value: TScrollBehavior) {
		if (this._scrollBehavior !== value) {
			this._scrollBehavior = value
			;(this.events as TEvented<TListEvents>).emit('change:scrollBehavior', value)
		}
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			maxRows: this._maxRows,
			autoWidth: this._autoWidth,
			wordWrap: this._wordWrap,
			scrollBehavior: this._scrollBehavior,
		} as TProps
	}
}
