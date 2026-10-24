import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import { TChangeEvent } from '../../../../common'
import type { TComponentSize, TEventSink, TValuePayload } from '../../../../common'
import TItemRow from '../../button/item-row.class'
import type { IButton } from '../../button/types'
import type { IMenuItem, IMenuItemProps, TMenuItemEvents } from './types'

/**
 * Тег строки. Один на строку и на `_ariaTag`: `aria` пункта лежит на строке,
 * и ARIA-половину правила «нативный атрибут вместо ARIA-дубля» решает её тег.
 * Константа модуля, а не поле: `_ariaTag` зовёт уже конструктор базы, когда
 * полей класса ещё нет. `div`, а не `button`: у выключенного пункта остаются
 * фокус и подсветка.
 */
const ROW_TAG = 'div'

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
 * «Граница переиспользования»). Общее у них не класс, а строка — `TItemRow` —
 * и подсветка `TListItemPlugin`.
 *
 * **Строка** (`row`) — кнопка, которой владеет пункт любого вида, как Select —
 * своим полем: это `TItemRow` на `div` (`ROW_TAG`), и роль и остановку Tab она
 * себе не пишет — их пишет набор `aria` пункта, который разметка кладёт на неё
 * же: роль — пункт, `tabindex="-1"` — `TMenuExtension`. Создаёт её пункт при
 * первом чтении, со своими `size` и `disabled`, и дальше пишет ей их смены, а
 * разметка отдаёт её кнопке целиком (`<Button :ctrl="row">`). Вида и варианта
 * строка не получает: вид ей даёт тема по контексту, а цвет она берёт с пункта
 * и панели. Пункты, которых никто не рисует, строки не держат.
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

	/** Строка — с первого чтения `row`; до него её нет. */
	protected _row: TItemRow | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuItem
		const own = props as Partial<IMenuItemProps>

		this._text = own.text ?? ctor.defaultValues.text

		this._aria.add('role', this._role)

		// Смены — строке, если её уже прочли. Подписки — с пункта, а не с первого
		// чтения строки: читает её монтирование, а пункт из данных и `ctrl` живут
		// дольше него, и снятое монтирование оставляло бы их на пункте
		this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			if (this._row) this._row.size = payload.newValue
		})
		this.events.on('change:disabled', (value: boolean) => {
			if (this._row) this._row.disabled = value
		})
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
	 * `aria` пункта стоит на строке (`row`). Её тег задаёт пункт (`ROW_TAG`), а
	 * не разметка, поэтому от `tag` корня ARIA-половина правила «нативный
	 * атрибут вместо ARIA-дубля» не зависит: у `div` своего `disabled` нет, и
	 * состояние остаётся `aria-disabled`.
	 */
	protected override get _ariaTag(): string {
		return ROW_TAG
	}

	/**
	 * Строка пункта — кнопка, которой владеет пункт (`TItemRow`): роль и
	 * остановку Tab ей пишет набор `aria` пункта, а `size` и `disabled` — сам
	 * пункт. Создаётся при первом чтении и дальше не меняется, поэтому
	 * `change:`-события у геттера нет, как у поля Select.
	 */
	get row(): IButton {
		return (this._row ??= this._createRow())
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

	/**
	 * Строка — со значениями пункта на момент первого чтения, а дальше их
	 * смены ей пишут подписки пункта: от корня пункта узел строки их не
	 * наследует, а разметка рядом с `ctrl` их не задаёт.
	 */
	private _createRow(): TItemRow {
		return new TItemRow({ tag: ROW_TAG, size: this.size, disabled: this.disabled })
	}
}
