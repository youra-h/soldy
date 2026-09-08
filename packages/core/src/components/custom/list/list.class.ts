import { TValueControl } from '../../base/value-control'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common'
import type { TScrollBehavior } from '../../../common'
import type {
	IList,
	IListComponentProps,
	IListProps,
	TListEvents,
	TListStates,
	TListValue,
} from './types'

/**
 * Компонент списка (TList).
 *
 * Владеет раскладкой (maxRows, autoWidth, wordWrap, scrollBehavior) и
 * **значением** — тем, что выбрано.
 *
 * Наследует `TValueControl`, а не `TControl`, и это не расширение ради удобства:
 * выбор у списка был всегда, просто отдавался наружу списком объектов
 * (`selected: TItem[]`) — то есть внутренней моделью коллекции. Потребителю
 * нужен ответ на вопрос «что выбрано», а это значения. `role="listbox"` по ARIA
 * — форменный виджет, нативный аналог `<select multiple>` имеет имя и значение.
 *
 * `value` — не второе состояние рядом с выбором, а его проекция: связь в обе
 * стороны держит `TValueSelectionExtension` в коллекции. `TInputControl` не
 * берём намеренно: `readonly`/`required`/`id` — свойства полей ввода, списку
 * они ни к чему.
 *
 * Коллекция создаётся отдельно через ListFactory или через TCollectionExtension
 * в adapter-слое.
 */
export class TList<
	TProps extends IListComponentProps = IListProps,
	TEvents extends TListEvents = TListEvents,
	TStates extends TListStates = TListStates,
>
	extends TValueControl<TListValue, TProps, TEvents, TStates>
	implements IList<TProps, TEvents, TStates>
{
	static override baseClass = 's-list'

	static defaultValues: Partial<IListComponentProps> = {
		...TValueControl.defaultValues,
		maxRows: 0,
		autoWidth: false,
		wordWrap: false,
		scrollBehavior: 'smooth',
	}

	protected _maxRows: number
	protected _autoWidth!: boolean
	protected _wordWrap!: boolean
	protected _scrollBehavior: TScrollBehavior

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TList

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
