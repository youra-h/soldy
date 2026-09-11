import { TValueControl } from '../../base/value-control'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common'
import type { ITagsProps, TTagsEvents, TTagsStates, ITags, TTagsValue, TTagsView } from './types'

/**
 * Компонент Tags — коллекция тегов.
 *
 * `TValueControl`, а не `TControl`: как и у ListBox, `value` — это проекция
 * выбора коллекции, а не отдельное состояние. Связь держит
 * `TValueSelectionExtension` движка.
 *
 * В отличие от ListBox режим выбора по умолчанию `none` — у задачи нет
 * требования выделять тег, чтобы его увидеть; выбор включается явным `mode`,
 * когда он нужен (например, множественный выбор Select, отображённый тегами).
 * Дефолт `TSelectionExtension` при этом не трогаем — он переопределён только
 * в `TagsFactory`.
 *
 * `_aria.role` здесь — только то, что Tags знает о себе сам: набор тегов
 * («list»). Когда у коллекции включён выбор, роль меняется на `listbox`, а
 * элементам — на `option`; это знание коллекции, а не ядра, и пишет его
 * `TTagsExtension`.
 *
 * `view` — как у ListBox: значение целиком со набора, каждый тег отдаёт его
 * своему внутреннему `Button` через `TTagsExtension`/`TTagsItemExtension`.
 * Дефолт `'filled'` — вид `Button` по умолчанию, чтобы включение пропа не
 * поменяло вид молча.
 */
export class TTags
	extends TValueControl<TTagsValue, ITagsProps, TTagsEvents, TTagsStates>
	implements ITags
{
	static override baseClass = 's-tags'

	static defaultValues: Partial<ITagsProps> = {
		...TValueControl.defaultValues,
		closable: false,
		view: 'filled',
	}

	protected _closable!: boolean
	protected _view!: TTagsView

	constructor(props: Partial<ITagsProps> = {}, options: IComponentOptions<TTagsStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTags

		this._closable = props.closable ?? ctor.defaultValues.closable!

		this._applyView(props.view ?? ctor.defaultValues.view!)

		this._aria.add('role', 'list')
	}

	get closable(): boolean {
		return this._closable
	}

	set closable(value: boolean) {
		if (this._closable === value) return

		this._closable = value
		;(this.events as TEvented<TTagsEvents>).emit('change:closable', value)
	}

	get view(): TTagsView {
		return this._view
	}

	set view(value: TTagsView) {
		if (this._view === value) return

		this._applyView(value, this._view)
		;(this.events as TEvented<TTagsEvents>).emit('change:view', value)
	}

	protected _applyView(newValue: TTagsView, oldValue?: TTagsView): void {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})

		this._view = newValue
	}

	override getProps(): ITagsProps {
		return {
			...super.getProps(),
			closable: this._closable,
			view: this._view,
		} as ITagsProps
	}
}
