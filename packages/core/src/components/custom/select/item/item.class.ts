import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import { TChangeEvent } from '../../../../common'
import type { TEventSink } from '../../../../common'
import type { ISelectItem, ISelectItemProps, TSelectItemEvents } from './types'

/**
 * Опция списка (`Select.Item`).
 *
 * `value` — ключ опции, `text` — то, что видно. Разделение то же, что у
 * `TTabsItem`: `value` внутри, `text` на экране.
 *
 * `TListBoxItem` намеренно не наследуем, хотя он тоже несёт `text`: вместе с
 * ним пришёл бы свой `contentFit` и связь со списком, а Select к нему
 * отношения не имеет — они лишь похожи внешне. Общее у них не класс, а
 * `Button` внутри строки, плагины подсветки и стили.
 */
export default class TSelectItem<
	TProps extends ISelectItemProps = ISelectItemProps,
	TEvents extends TSelectItemEvents = TSelectItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
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

	protected _text: string

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TSelectItem
		const own = props as Partial<ISelectItemProps>

		this._text = own.text ?? ctor.defaultValues.text

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

	/**
	 * `aria` опции стоит на вложенном `Button` — строке опции. Тег у неё
	 * фиксированный (`span`), разметка задаёт его сама, поэтому от `tag` корня
	 * ARIA-половина правила «нативный атрибут вместо ARIA-дубля» не зависит:
	 * у `span` своего `disabled` нет, и состояние остаётся `aria-disabled`,
	 * каким бы ни был корень.
	 */
	protected override get _ariaTag(): string {
		return 'span'
	}

	get text(): string {
		return this._text
	}

	set text(value: string) {
		if (value === this._text) return

		const e = new TChangeEvent(value, this._text)

		this._sink.emit('change:text:before', e)

		if (e.defaultPrevented || e.value === this._text) return

		this._text = e.value
		this._sink.emit('change:text', { newValue: e.value, oldValue: e.oldValue })
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
		} as TProps
	}
}
