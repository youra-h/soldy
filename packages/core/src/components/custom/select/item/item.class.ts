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
import type { ISelectItem, ISelectItemProps, TSelectItemEvents } from './types'

/**
 * Тег строки. Один на строку и на `_ariaTag`: `aria` опции лежит на строке, и
 * ARIA-половину правила «нативный атрибут вместо ARIA-дубля» решает её тег.
 * Константа модуля, а не поле: `_ariaTag` зовёт уже конструктор базы, когда
 * полей класса ещё нет.
 */
const ROW_TAG = 'span'

/**
 * Опция списка (`Select.Item`).
 *
 * `value` — ключ опции, `text` — то, что видно. Разделение то же, что у
 * `TTabsItem`: `value` внутри, `text` на экране.
 *
 * `TListBoxItem` намеренно не наследуем, хотя он тоже несёт `text`: вместе с
 * ним пришёл бы свой `contentFit` и связь со списком, а Select к нему
 * отношения не имеет — они лишь похожи внешне. Общее у них не класс, а
 * строка — `TItemRow`, плагины подсветки и стили.
 *
 * **Строка** (`row`) — кнопка, которой владеет опция, как Select — своим
 * полем: это `TItemRow` на `span` (`ROW_TAG`), и роль и остановку Tab она себе
 * не пишет — их пишет набор `aria` опции, который разметка кладёт на неё же:
 * роль — опция, `tabindex="-1"` — `TSelectExtension`. Создаёт её опция при
 * первом чтении, со своими `size`, `variant` и `disabled`, и дальше пишет ей
 * их смены, а разметка отдаёт её кнопке целиком (`<Button :ctrl="row">`).
 * Опции закрытой панели, которых никто не рисует, строки не держат.
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
		TDefaultValues<ISelectItemProps, 'text'> = {
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

		const ctor = new.target as typeof TSelectItem
		const own = props as Partial<ISelectItemProps>

		this._text = own.text ?? ctor.defaultValues.text

		// Только то, что опция знает о себе сама: она — опция.
		//
		// `id`, `aria-selected` и `tabindex="-1"` — не отсюда. `id` нужен
		// документу — на опцию ссылается поле через `aria-activedescendant`, —
		// и пишет его плагин связок (`TOptionIdsPlugin`). Выбор и модель фокуса
		// комбобокса знает коллекция, а не элемент; пишет `TSelectExtension`.
		this._aria.add('role', 'option')

		// Смены — строке, если её уже прочли. Подписки — с опции, а не с первого
		// чтения строки: читает её монтирование, а опция из данных и `ctrl` живут
		// дольше него, и снятое монтирование оставляло бы их на опции
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
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TSelectItemEvents> {
		return this.events
	}

	/**
	 * `aria` опции стоит на строке (`row`). Её тег задаёт опция (`ROW_TAG`), а
	 * не разметка, поэтому от `tag` корня ARIA-половина правила «нативный
	 * атрибут вместо ARIA-дубля» не зависит: у `span` своего `disabled` нет, и
	 * состояние остаётся `aria-disabled`, каким бы ни был корень.
	 */
	protected override get _ariaTag(): string {
		return ROW_TAG
	}

	/**
	 * Строка опции — кнопка, которой владеет опция (`TItemRow`): роль и
	 * остановку Tab ей пишет набор `aria` опции, а `size`, `variant` и
	 * `disabled` — сама опция. Создаётся при первом чтении и дальше не
	 * меняется, поэтому `change:`-события у геттера нет, как у поля Select.
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

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
		} as TProps
	}

	/**
	 * Строка — со значениями опции на момент первого чтения, а дальше их смены
	 * ей пишут подписки опции: от корня опции узел строки их не наследует, а
	 * разметка рядом с `ctrl` их не задаёт.
	 */
	private _createRow(): TItemRow {
		return new TItemRow({
			tag: ROW_TAG,
			size: this.size,
			variant: this.variant,
			disabled: this.disabled,
		})
	}
}
