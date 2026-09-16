import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../../base/component'
import { TStateUnit } from '../../../../common'
import type { TValuePayload, TEventSink } from '../../../../common'
import type { TListItemContentFit } from '../../list'
import type {
	IListBoxItem,
	IListBoxItemProps,
	TListBoxItemEvents,
	TListBoxItemStates,
} from './types'

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
	extends TValueControl<string | number, TProps, TEvents, TListBoxItemStates>
	implements IListBoxItem<TProps, TEvents>
{
	static override baseClass = 's-list-box-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IListBoxItemProps, 'text', 'contentFit'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		contentFit: undefined,
		variant: 'normal',
		tag: 'div',
	}

	protected _contentFit: TListItemContentFit | undefined

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TListBoxItemStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TListBoxItem
		const customProps = props as Partial<IListBoxItemProps>

		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text })

		this._contentFit = customProps.contentFit ?? ctor.defaultValues.contentFit

		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			this._sink.emit('change:text', payload)
		})
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
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
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
