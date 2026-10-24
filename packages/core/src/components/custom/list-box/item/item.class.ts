import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import { TChangeEvent } from '../../../../common'
import type {
	TComponentSize,
	TComponentVariant,
	TEventSink,
	TValuePayload,
} from '../../../../common'
import TItemRow from '../../button/item-row.class'
import type { IButton } from '../../button/types'
import type { TListItemContentFit } from '../../list'
import type { TListBoxView } from '../types'
import type { IListBoxItem, IListBoxItemProps, TListBoxItemEvents } from './types'

/**
 * Тег строки. Один на строку и на `_ariaTag`: `aria` элемента лежит на строке,
 * и ARIA-половину правила «нативный атрибут вместо ARIA-дубля» решает её тег.
 * Константа модуля, а не поле: `_ariaTag` зовёт уже конструктор базы, когда
 * полей класса ещё нет.
 */
const ROW_TAG = 'div'

/**
 * Элемент списка.
 *
 * `TValueControl`, где `value` — ключ элемента: по нему коллекция и находит,
 * что выбрать, когда списку задали значение.
 *
 * `contentFit` здесь трёхзначен: `undefined` означает «взять у списка», и это
 * не то же самое, что `truncate`. Разрешение делает расширение коллекции — оно
 * же пишет элементу `data-content-fit`.
 *
 * Вид (`view`) элементу диктует список, как `size` и `variant`: значение
 * пишет `TListBoxExtension` — при добавлении, на смену у списка и поверх
 * патча. Своего модификатора у корня элемента нет: вид рисует строка — вид
 * списка и есть вид его строк.
 *
 * **Строка** (`row`) — кнопка, которой владеет элемент, как Select — своим
 * полем: это `TItemRow` на `div` (`ROW_TAG`), и роль и остановку Tab она себе
 * не пишет — их пишет набор `aria` элемента, который разметка кладёт на неё
 * же: роль — элемент, `tabindex="-1"` — `TListBoxExtension`. Создаёт её
 * элемент при первом чтении, со своими `size`, `variant`, `disabled` и
 * `view`, и дальше пишет ей их смены, а разметка отдаёт её кнопке целиком
 * (`<Button :ctrl="row">`). Элемент из данных, которого никто не рисует
 * (вне окна `Virtual`), строки не держит.
 */
export default class TListBoxItem<
	TProps extends IListBoxItemProps = IListBoxItemProps,
	TEvents extends TListBoxItemEvents = TListBoxItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
	implements IListBoxItem<TProps, TEvents>
{
	static override baseClass = 'so-list-box-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IListBoxItemProps, 'text', 'contentFit' | 'view'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		contentFit: undefined,
		view: undefined,
		tag: 'div',
	}

	protected _contentFit: TListItemContentFit | undefined

	protected _text: string

	protected _view: TListBoxView | undefined

	/** Строка — с первого чтения `row`; до него её нет. */
	protected _row: TItemRow | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TListBoxItem
		const customProps = props as Partial<IListBoxItemProps>

		this._text = customProps.text ?? ctor.defaultValues.text

		this._contentFit = customProps.contentFit ?? ctor.defaultValues.contentFit

		this._view = customProps.view ?? ctor.defaultValues.view

		// Только то, что элемент знает о себе сам: он — опция.
		//
		// `aria-selected` и `tabindex="-1"` — не отсюда: первый выражает выбор,
		// второй — модель фокуса списка. И то и другое знает коллекция, а не
		// элемент; пишет `TListBoxExtension`.
		this._aria.add('role', 'option')

		// Смены — строке, если её уже прочли. Подписки — с элемента, а не с
		// первого чтения строки: читает её монтирование, а элемент из данных и
		// `ctrl` живут дольше него, и снятое монтирование оставляло бы их на
		// элементе
		this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			if (this._row) this._row.size = payload.newValue
		})
		this.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				if (this._row) this._row.variant = payload.newValue
			},
		)
		this.events.on('change:disabled', (value: boolean) => {
			if (this._row) this._row.disabled = value
		})
		this.events.on('change:view', (value: TListBoxView | undefined) => {
			if (this._row) this._row.view = value
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
	 * `aria` элемента стоит на строке (`row`). Её тег задаёт элемент
	 * (`ROW_TAG`), а не разметка, поэтому от `tag` корня ARIA-половина правила
	 * «нативный атрибут вместо ARIA-дубля» не зависит: у `div` своего
	 * `disabled` нет, и состояние остаётся `aria-disabled`, каким бы ни был
	 * корень.
	 */
	protected override get _ariaTag(): string {
		return ROW_TAG
	}

	/**
	 * Строка элемента — кнопка, которой владеет элемент (`TItemRow`): роль и
	 * остановку Tab ей пишет набор `aria` элемента, а `size`, `variant`,
	 * `disabled` и `view` — сам элемент. Создаётся при первом чтении и дальше
	 * не меняется, поэтому `change:`-события у геттера нет, как у поля Select.
	 */
	get row(): IButton {
		return (this._row ??= this._createRow())
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

	/** Вид строки. Диктует его список: значение пишет его расширение коллекции. */
	get view(): TListBoxView | undefined {
		return this._view
	}

	set view(value: TListBoxView | undefined) {
		if (this._view === value) return

		this._view = value
		this._sink.emit('change:view', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			contentFit: this.contentFit,
			view: this.view,
		} as TProps
	}

	/**
	 * Строка — со значениями элемента на момент первого чтения, а дальше их
	 * смены ей пишут подписки элемента: от корня элемента узел строки их не
	 * наследует, а разметка рядом с `ctrl` их не задаёт.
	 */
	private _createRow(): TItemRow {
		return new TItemRow({
			tag: ROW_TAG,
			size: this.size,
			variant: this.variant,
			disabled: this.disabled,
			view: this.view,
		})
	}
}
