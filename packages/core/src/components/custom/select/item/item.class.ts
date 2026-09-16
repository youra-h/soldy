import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../../base/component'
import { TStateUnit } from '../../../../common'
import type { TValuePayload, TEventSink } from '../../../../common'
import type { ISelectItem, ISelectItemProps, TSelectItemEvents, TSelectItemStates } from './types'

/**
 * Опция списка (`Select.Item`).
 *
 * `value` — ключ опции, `text` — то, что видно. Разделение то же, что у
 * `TTabsItem`: `value` внутри, `text` на экране.
 *
 * `TListBoxItem` намеренно не наследуем, хотя он тоже несёт `text`: вместе с
 * ним пришёл бы `wordWrap` и связь со списком, а Select к нему отношения не
 * имеет — они лишь похожи внешне. Общее у них не класс, а `Button` внутри
 * строки, плагины подсветки и стили.
 */
export default class TSelectItem<
	TProps extends ISelectItemProps = ISelectItemProps,
	TEvents extends TSelectItemEvents = TSelectItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TSelectItemStates>
	implements ISelectItem<TProps, TEvents>
{
	static override baseClass = 's-select-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<ISelectItemProps, 'text'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		tag: 'div',
	}

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TSelectItemStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TSelectItem
		const own = props as Partial<ISelectItemProps>

		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: own.text ?? ctor.defaultValues.text })

		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			this._sink.emit('change:text', payload)
		})

		// Только то, что опция знает о себе сама: она — опция.
		//
		// `id` и `aria-selected` — не отсюда: первый нужен, чтобы на опцию
		// сослалось поле через `aria-activedescendant`, второй выражает выбор.
		// И то и другое знает коллекция, а не элемент; пишет `TSelectExtension`.
		this._aria.add('role', 'option')
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TSelectItemEvents> {
		return this.events
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
		} as TProps
	}
}
