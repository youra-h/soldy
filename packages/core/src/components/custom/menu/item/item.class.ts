import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import { TChangeEvent } from '../../../../common'
import type { TEventSink } from '../../../../common'
import type { IMenuItem, IMenuItemProps, TMenuItemEvents } from './types'

/**
 * Пункт меню — действие (`Menu.Item`): «Изменить», «Удалить».
 *
 * `TValueControl`, где `value` — ключ пункта: по нему потребитель узнаёт, что
 * нажали (событие коллекции `choose`).
 *
 * Сам пункт знает о себе только то, что он такое: роль `menuitem`. Остановку
 * Tab (`tabindex="-1"`), отметку флажка (`aria-checked`) и размер меню ему
 * пишет коллекция — `TMenuExtension`: это знание меню, а не пункта.
 *
 * Флажок (`TMenuCheckboxItem`) — наследник, а не режим: фабрика коллекции
 * строит пункты этого класса и всё, что не его экземпляр, считает сырым
 * источником (`isSource`), — флажок разметки иначе стал бы новым пунктом.
 *
 * `TListBoxItem` не наследуем, хотя он тоже несёт `text`: вместе с ним пришли
 * бы `contentFit` и связь со списком, которых у меню нет (`docs/agents/patterns.md`,
 * «Граница переиспользования»). Общее у них не класс, а `Button` в строке и
 * подсветка `TListItemPlugin`.
 */
export default class TMenuItem<
	TProps extends IMenuItemProps = IMenuItemProps,
	TEvents extends TMenuItemEvents = TMenuItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
	implements IMenuItem<TProps, TEvents>
{
	static override baseClass = 'so-menu-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IMenuItemProps, 'text'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		tag: 'div',
	}

	protected _text: string

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuItem
		const own = props as Partial<IMenuItemProps>

		this._text = own.text ?? ctor.defaultValues.text

		this._aria.add('role', this._role)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TMenuItemEvents> {
		return this.events
	}

	/** Роль пункта: действие — `menuitem`. Флажок называет свою. */
	protected get _role(): string {
		return 'menuitem'
	}

	/**
	 * `aria` пункта стоит на вложенном `Button` — строке пункта. Тег у неё
	 * фиксированный (`div`), разметка задаёт его сама, поэтому от `tag` корня
	 * ARIA-половина правила «нативный атрибут вместо ARIA-дубля» не зависит:
	 * у `div` своего `disabled` нет, и состояние остаётся `aria-disabled`.
	 */
	protected override get _ariaTag(): string {
		return 'div'
	}

	/** Действие не отмечается: нажатие выполняет его и закрывает меню. */
	get checkable(): boolean {
		return false
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
