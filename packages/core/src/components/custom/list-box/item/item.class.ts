import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import { TChangeEvent } from '../../../../common'
import type { TEventSink } from '../../../../common'
import type { TListItemContentFit } from '../../list'
import type { IListBoxItem, IListBoxItemProps, TListBoxItemEvents } from './types'

/**
 * Элемент списка.
 *
 * `TValueControl`, где `value` — ключ элемента: по нему коллекция и находит,
 * что выбрать, когда списку задали значение.
 *
 * `contentFit` здесь трёхзначен: `undefined` означает «взять у списка», и это
 * не то же самое, что `truncate`. Разрешение делает расширение коллекции — оно
 * же пишет элементу `data-content-fit`.
 */
export default class TListBoxItem<
	TProps extends IListBoxItemProps = IListBoxItemProps,
	TEvents extends TListBoxItemEvents = TListBoxItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
	implements IListBoxItem<TProps, TEvents>
{
	static override baseClass = 's-list-box-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IListBoxItemProps, 'text', 'contentFit'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		contentFit: undefined,
		tag: 'div',
	}

	protected _contentFit: TListItemContentFit | undefined

	protected _text: string

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TListBoxItem
		const customProps = props as Partial<IListBoxItemProps>

		this._text = customProps.text ?? ctor.defaultValues.text

		this._contentFit = customProps.contentFit ?? ctor.defaultValues.contentFit
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TListBoxItemEvents> {
		return this.events
	}

	/**
	 * `aria` элемента стоит на вложенном `Button` — строке списка. Тег у неё
	 * фиксированный (`div`), разметка задаёт его сама, поэтому от `tag` корня
	 * ARIA-половина правила «нативный атрибут вместо ARIA-дубля» не зависит:
	 * у `div` своего `disabled` нет, и состояние остаётся `aria-disabled`,
	 * каким бы ни был корень.
	 */
	protected override get _ariaTag(): string {
		return 'div'
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

	get contentFit(): TListItemContentFit | undefined {
		return this._contentFit
	}

	set contentFit(value: TListItemContentFit | undefined) {
		if (this._contentFit === value) return

		this._contentFit = value
		this._sink.emit('change:contentFit', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			contentFit: this.contentFit,
		} as TProps
	}
}
