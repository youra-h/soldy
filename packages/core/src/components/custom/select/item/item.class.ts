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
 *
 * `id` — значение потребителя, как у поля (`TInputControl.id`): в `aria` ядро
 * его не пишет. На `id` строки ссылается `aria-activedescendant` поля, и
 * строке его пишет плагин `id` элемента (`TOptionIdsPlugin`): свой `id`
 * главнее, без него — `id` от монтирования.
 */
export default class TSelectItem<
	TProps extends ISelectItemProps = ISelectItemProps,
	TEvents extends TSelectItemEvents = TSelectItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
	implements ISelectItem<TProps, TEvents>
{
	static override baseClass = 'so-select-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<ISelectItemProps, 'text', 'id'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		id: undefined,
		tag: 'div',
	}

	protected _text: string

	protected _id: string | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TSelectItem
		const own = props as Partial<ISelectItemProps>

		this._text = own.text ?? ctor.defaultValues.text

		this._id = own.id ?? ctor.defaultValues.id

		// Только то, что опция знает о себе сама: она — опция.
		//
		// `id` и `aria-selected` — не отсюда. Первый нужен документу: на опцию
		// ссылается поле через `aria-activedescendant`, и пишет его плагин `id`
		// элемента (`TOptionIdsPlugin`). Второй выражает выбор, его знает
		// коллекция, а не элемент; пишет `TSelectExtension`.
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

	/**
	 * Свой `id` строки опции — значение потребителя: задают его там, где на
	 * опцию ссылается его разметка. Не задан — `undefined`, и у строки `id` от
	 * монтирования.
	 */
	get id(): string | undefined {
		return this._id
	}

	set id(value: string | undefined) {
		if (this._id === value) return

		this._id = value
		this._sink.emit('change:id', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			id: this._id,
		} as TProps
	}
}
