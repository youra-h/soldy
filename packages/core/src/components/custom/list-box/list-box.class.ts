import { TValueControl } from '../../base/value-control'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common'
import type {
	IListBoxProps,
	TListBoxView,
	TListBoxEvents,
	TListBoxStates,
	IListBox,
	TListBoxValue,
} from './types'

/**
 * Компонент ListBox — список с выбором.
 *
 * Раньше между ним и `TValueControl` стоял `TList`. Слоя не стало: наследник у
 * него был ровно один, а «общее для всех списков» оказалось не в базовом
 * компоненте, а в плагинах — ими пользуется и Select, который от списка не
 * наследуется вовсе.
 *
 * `TValueControl`, а не `TControl`: выбор у списка был всегда, но отдавался
 * наружу списком объектов — внутренней моделью коллекции. Потребителю нужен
 * ответ в значениях, и он же уходит в форму. Связь `value` ↔ выбор держит
 * `TValueSelectionExtension`.
 *
 * **Чего здесь нет намеренно:** `maxRows`, `wordWrap`, `autoWidth`,
 * `scrollBehavior`. Это свойства раскладки, и они живут в
 * `TListLayoutPlugin` — том самом, который их и обрабатывает. Так их получает
 * любой компонент, подключивший плагин, без общего предка: Select ровно так и
 * делает.
 */
export class TListBox
	extends TValueControl<TListBoxValue, IListBoxProps, TListBoxEvents, TListBoxStates>
	implements IListBox
{
	static override baseClass = 's-list-box'

	static defaultValues: Partial<IListBoxProps> = {
		...TValueControl.defaultValues,
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
		if (this._view === value) return

		this._applyView(value, this._view)
		;(this.events as TEvented<TListBoxEvents>).emit('change:view', value)
	}

	protected _applyView(newValue: TListBoxView, oldValue?: TListBoxView): void {
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
