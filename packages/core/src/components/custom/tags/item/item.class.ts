import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import type { TDirection } from '../../../base/component-view'
import { TAria, TChangeEvent } from '../../../../common'
import type {
	TComponentSize,
	TComponentVariant,
	TEventSink,
	TValuePayload,
} from '../../../../common'
import TOwnedButton from '../../button/owned-button.class'
import type { IButton } from '../../button/types'
import type { ITagsItem, ITagsItemProps, TTagsItemEvents } from './types'

/**
 * Тег строки. Один на строку и на `_ariaTag`: `aria` тега лежит на строке, и
 * ARIA-половину правила «нативный атрибут вместо ARIA-дубля» решает её тег.
 * Константа модуля, а не поле: `_ariaTag` зовёт уже конструктор базы, когда
 * полей класса ещё нет.
 */
const ROW_TAG = 'div'

/**
 * Элемент Tags — тег.
 *
 * `TValueControl`, где `value` — ключ тега: по нему коллекция находит, что
 * выделить, когда набору задали значение.
 *
 * Закрытие — копия `TTabsItem`: явное значение элемента приоритетнее
 * глобального `closable` компонента. Что выключенный тег не закрывается,
 * решает item-адаптер коллекции (`TTagsItemExtension.closable`), а не элемент.
 *
 * Размер тегу диктует набор, а вариант (`variant`) у тега свой: набор его не
 * пишет. Тег без своего варианта тема красит вариантом набора — по классу
 * набора, а не по значению на теге.
 *
 * **Строка** (`row`) — кнопка, которой владеет тег, как Select — своим полем:
 * тег создаёт её один раз и пишет ей свои `size`, `variant`, `disabled` и
 * `direction`, а разметка отдаёт её кнопке целиком (`<Button :ctrl="row">`).
 * Это `TOwnedButton`: роль и остановку Tab она себе не пишет — их пишет набор
 * `aria` тега, который разметка кладёт на неё же: роль — тег, `tabindex` —
 * `TTagsExtension` по режиму выбора. Без выбора `tabindex` у строки нет вовсе,
 * и фокус от клика она не принимает: действия у `listitem` нет. Тег строки
 * задаёт тег (`ROW_TAG`), а не разметка.
 *
 * Кнопка закрытия, в отличие от таба, — живой набор `closeAria`, а не
 * вычисляемый снимок: её `tabindex` зависит от режима выбора коллекции, о
 * котором тег не знает. Имя от локали пишет плагин имён
 * (`TTagsItemNamesPlugin`), `tabindex` — `TTagsExtension`, как у `aria`
 * строки роль пишет тег, а `aria-selected` — коллекция.
 */
export default class TTagsItem<
	TProps extends ITagsItemProps = ITagsItemProps,
	TEvents extends TTagsItemEvents = TTagsItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents>
	implements ITagsItem<TProps, TEvents>
{
	static override baseClass = 'so-tags-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<ITagsItemProps, 'text', 'closable'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		closable: undefined,
		tag: 'div',
	}

	protected _closeAria: TAria
	protected readonly _row: TOwnedButton

	protected _text: string
	protected _closable: boolean | undefined

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTagsItem
		const customProps = props as Partial<ITagsItemProps>

		this._text = customProps.text ?? ctor.defaultValues.text

		this._closable = customProps.closable ?? ctor.defaultValues.closable

		this._closeAria = new TAria()

		this._closeAria.events.on('change', () =>
			this._sink.emit('change:closeAria', this._closeAria.toObject()),
		)

		this._classes.toggle(`--closable`, !!this._closable)

		// Только то, что тег знает о себе сам: он — элемент набора. Роль
		// меняется на `option`, когда у коллекции включён выбор — об этом
		// знает `TTagsExtension`, не элемент.
		this._aria.add('role', 'listitem')

		// Строка — со значениями тега, и дальше их пишет он: от корня тега
		// узел строки их не наследует, а разметка рядом с `ctrl` их не задаёт
		this._row = new TOwnedButton({
			tag: ROW_TAG,
			size: this.size,
			variant: this.variant,
			disabled: this.disabled,
			direction: this.direction,
		})

		this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			this._row.size = payload.newValue
		})
		this.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				this._row.variant = payload.newValue
			},
		)
		this.events.on('change:disabled', (value: boolean) => (this._row.disabled = value))
		this.events.on('change:direction', (value: TDirection) => (this._row.direction = value))
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTagsItemEvents> {
		return this.events
	}

	/**
	 * `aria` тега стоит на строке (`row`). Её тег задаёт тег (`ROW_TAG`), а не
	 * разметка, поэтому от `tag` корня ARIA-половина правила «нативный атрибут
	 * вместо ARIA-дубля» не зависит: у `div` своего `disabled` нет, и состояние
	 * остаётся `aria-disabled`, каким бы ни был корень.
	 */
	protected override get _ariaTag(): string {
		return ROW_TAG
	}

	/**
	 * Строка тега — кнопка, которой владеет тег (`TOwnedButton`): роль и
	 * остановку Tab ей пишет набор `aria` тега, а `size`, `variant`, `disabled`
	 * и `direction` — сам тег. Не меняется за время жизни тега, поэтому
	 * `change:`-события у геттера нет, как у поля Select.
	 */
	get row(): IButton {
		return this._row
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
	 * Своё значение тега, `undefined` — наследовать от владельца.
	 *
	 * `disabled` его не трогает: правило «выключенный тег не закрывается»
	 * выводит item-адаптер (`TTagsItemExtension.closable`). Раньше оно было
	 * подпиской на `change:disabled`, которая переписывала это значение, — и
	 * у тега, выключенного со старта, не срабатывала вовсе: события нет.
	 */
	get closable(): boolean | undefined {
		return this._closable
	}

	set closable(value: boolean | undefined) {
		if (value === this._closable) return

		const e = new TChangeEvent(value, this._closable)

		this._sink.emit('change:closable:before', e)

		if (e.defaultPrevented || e.value === this._closable) return

		this._closable = e.value
		this._classes.toggle(`--closable`, !!e.value)
		this._sink.emit('change:closable', e.value)
	}

	/**
	 * Атрибуты кнопки закрытия — отдельный набор, а не часть `aria`: `aria`
	 * описывает сам тег, а это кнопка рядом с ним. Один элемент — один набор.
	 *
	 * Живой, как `aria`, потому что пишут в него двое: имя с текстом тега
	 * («Close Настройки») — плагин имён по шаблону локали, `tabindex` —
	 * `TTagsExtension` по режиму выбора. За границу core → ui уходит снимок
	 * (`valueOf()`), об изменении набор сообщает `change:closeAria`.
	 */
	get closeAria(): TAria {
		return this._closeAria
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			closable: this.closable,
		} as TProps
	}
}
