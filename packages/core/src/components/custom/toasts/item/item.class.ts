import { TComponentView } from '../../../base/component-view'
import type { TDefaultValues } from '../../../base/component'
import type { TCloseReason, TSwipe, TSwipeSide } from '../../../base/layer'
import { TAria, TChangeEvent } from '../../../../common'
import type { TEventSink } from '../../../../common'
import type { IToastsItem, IToastsItemProps, TToastsItemEvents, TToastsItemType } from './types'

/**
 * Тост — элемент коллекции Toasts.
 *
 * База — `TComponentView`, а не `TStylable`: ни размера, ни варианта у тоста
 * нет. Что случилось, говорит вид сообщения, а не цвет темы.
 *
 * **Вид** (`type`: `info`, `success`, `warning`, `error`; не задан — обычное
 * сообщение) — модификатор `--type-<v>`, без вида модификатора нет. Значок по
 * виду выбирает разметка — роль иконки, своя у каждого вида, — а цвет значка
 * и плашки решает тема. Это union ядра, а не реестр темы: смысл у вида один в
 * любой теме, а по имени варианта темы библиотека значок выбрать не смогла бы.
 *
 * **Ожидание** (`loading`) — тост сообщает о работе, которая ещё идёт
 * («Сохраняем…»): на месте значка разметка рисует бегущее кольцо, при любом
 * виде и любом значке, и сам тост не закрывается — длительность ожидающего у
 * коллекции `0` (`durationOf`), а снятое ожидание начинает отсчёт заново.
 * Флаг, а не пятый вид: ждать может сообщение любого вида. ARIA ожидание не
 * меняет: коробка значка — декор, а что происходит, говорит текст; `aria-busy`
 * на живой области отложил бы объявление «Сохраняем…».
 *
 * **Закрытие окончательное.** `open` только для чтения, закрывает `close()`:
 * закрытый тост гаснет переходом темы и уходит из коллекции, когда доиграл
 * переходы, а открытым снова не становится. Поэтому отменять закрытие и
 * перезапускать тост плагинам нечего — пользователь закрывает его крестиком,
 * жестом и Escape, а таймер — по истечении времени, и всё это один `close()`.
 * Запрос закрытия (`ICloseRequestable`) тост принимает всегда: так жест,
 * общий со слоями (`TSwipePlugin`), закрывает и тост.
 *
 * **Жест** — за всю плашку (`swipe` всегда `panel`), к стороне, которую пишет
 * коллекция по месту региона (`swipeSide`): у боковых мест — к своему краю
 * строки, у мест по центру — вверх или вниз. Закрытый тост не тянут.
 *
 * **ARIA.** Тост — живая область своей роли: `status` — вежливое объявление,
 * `alert` (`alert: true`) — срочное, как `alert` у Dialog. Фокус тост не
 * забирает: к нему ведёт F8, и `tabindex="0"` делает его фокусируемым, у
 * закрытого — `-1`. Кнопка закрытия — отдельный набор `closeAria`: имя с
 * текстом тоста пишет плагин имён.
 *
 * Теме ядро отдаёт `data-open` (`true` с первой отрисовки, `false` — тост
 * закрыт и гаснет) и `data-swiping` (тянут).
 *
 * **Своё содержимое** (`render`) ядро не читает: что это и как его
 * нарисовать, знает адаптер — во Vue компонент, которому тост приходит
 * пропом `toast`, и кнопка внутри может его закрыть.
 */
export default class TToastsItem<
	TProps extends IToastsItemProps = IToastsItemProps,
	TEvents extends TToastsItemEvents = TToastsItemEvents,
>
	extends TComponentView<TProps, TEvents>
	implements IToastsItem<TProps, TEvents>
{
	static override baseClass = 'so-toasts-item'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<
			IToastsItemProps,
			'text' | 'description' | 'loading' | 'closable' | 'alert',
			'type' | 'duration' | 'render'
		> = {
		...TComponentView.defaultValues,
		tag: 'li',
		text: '',
		description: '',
		type: undefined,
		loading: false,
		closable: true,
		duration: undefined,
		alert: false,
		render: undefined,
	}

	protected _text: string
	protected _description: string
	protected _type: TToastsItemType | undefined
	protected _loading: boolean
	protected _closable: boolean
	protected _duration: number | undefined
	protected _alert: boolean
	protected _render: unknown
	protected _open = true
	protected _swipeSide: TSwipeSide = 'end'
	protected _swiping = false
	protected _closeAria: TAria

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TToastsItem
		const own = props as Partial<IToastsItemProps>

		this._text = own.text ?? ctor.defaultValues.text
		this._description = own.description ?? ctor.defaultValues.description
		this._type = own.type ?? ctor.defaultValues.type
		this._loading = own.loading ?? ctor.defaultValues.loading
		this._closable = own.closable ?? ctor.defaultValues.closable
		this._duration = own.duration ?? ctor.defaultValues.duration
		this._alert = own.alert ?? ctor.defaultValues.alert
		this._render = own.render ?? ctor.defaultValues.render

		this._closeAria = new TAria(() =>
			this._sink.emit('change:closeAria', this._closeAria.toObject()),
		)

		this._classes.swap({ prefix: '--type-', newValue: this._type })
		this._syncRole()
		this._aria.add('tabindex', '0')
		this._dataset.add('open', true)
		this._dataset.add('swiping', false)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected override get _sink(): TEventSink<TToastsItemEvents> {
		return this.events
	}

	/** Текст тоста — его заголовок. */
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

	/** Описание под текстом. */
	get description(): string {
		return this._description
	}

	set description(value: string) {
		if (value === this._description) return

		this._description = value
		this._sink.emit('change:description', value)
	}

	/** Вид сообщения; `undefined` — обычное сообщение. */
	get type(): TToastsItemType | undefined {
		return this._type
	}

	/**
	 * `swap`, а не `swapClass` с шаблонной строкой: вида может не быть, и
	 * шаблон дал бы `--type-undefined`.
	 */
	set type(value: TToastsItemType | undefined) {
		if (value === this._type) return

		this._classes.swap({ prefix: '--type-', oldValue: this._type, newValue: value })
		this._type = value
		this._sink.emit('change:type', value)
	}

	/** Тост ждёт: на месте значка кольцо, и сам тост не закрывается. */
	get loading(): boolean {
		return this._loading
	}

	set loading(value: boolean) {
		if (value === this._loading) return

		this._loading = value
		this._sink.emit('change:loading', value)
	}

	/** Есть ли у тоста кнопка закрытия. */
	get closable(): boolean {
		return this._closable
	}

	set closable(value: boolean) {
		if (value === this._closable) return

		const e = new TChangeEvent(value, this._closable)

		this._sink.emit('change:closable:before', e)

		if (e.defaultPrevented || e.value === this._closable) return

		this._closable = e.value
		this._sink.emit('change:closable', e.value)
	}

	/**
	 * Своя длительность, мс. `undefined` — как у владельца, `0` — тост
	 * держится, пока его не закроют. Итог — у коллекции (`durationOf`): своя
	 * или владельца, а пока тост ждёт — `0`.
	 */
	get duration(): number | undefined {
		return this._duration
	}

	set duration(value: number | undefined) {
		if (value === this._duration) return

		this._duration = value
		this._sink.emit('change:duration', value)
	}

	/** Срочное сообщение: `role="alert"` вместо `role="status"`. */
	get alert(): boolean {
		return this._alert
	}

	set alert(value: boolean) {
		if (value === this._alert) return

		this._alert = value
		this._syncRole()
		this._sink.emit('change:alert', value)
	}

	/** Своё содержимое: рисует адаптер, ядро значение не читает. */
	get render(): unknown {
		return this._render
	}

	set render(value: unknown) {
		if (value === this._render) return

		this._render = value
		this._sink.emit('change:render', value)
	}

	/** Открыт ли тост. Закрытие окончательное: закрывает `close()`. */
	get open(): boolean {
		return this._open
	}

	/**
	 * Закрыть тост. Закрытый гаснет переходом темы (`data-open="false"`),
	 * перестаёт быть остановкой фокуса и уходит из коллекции, когда доиграл
	 * переходы, — убирает его плагин удаления владельца. Повторный вызов
	 * ничего не делает.
	 */
	close(): void {
		if (!this._open) return

		this._open = false
		this._setSwiping(false)
		this._dataset.add('open', false)
		this._aria.add('tabindex', '-1')
		this._sink.emit('change:open', false)
	}

	/**
	 * Пользователь закрывает тост — крестиком, жестом, Escape. Тост соглашается
	 * всегда: отменяемого закрытия у него нет.
	 */
	requestClose(_reason: TCloseReason): void {
		this.close()
	}

	/** За что тост смахивают — за всю плашку, кроме контролов. */
	get swipe(): TSwipe {
		return 'panel'
	}

	/** Куда тост уходит жестом. Пишет коллекция по месту региона. */
	get swipeSide(): TSwipeSide {
		return this._swipeSide
	}

	set swipeSide(value: TSwipeSide) {
		if (value === this._swipeSide) return

		this._swipeSide = value
		this._sink.emit('change:swipeSide', value)
	}

	/** Идёт жест: с `beginSwipe` до `endSwipe` или до закрытия. */
	get swiping(): boolean {
		return this._swiping
	}

	/** Жест начался: тост тянут. Закрытый тост не тянут — жест не начинается. */
	beginSwipe(): boolean {
		if (!this._open) return false

		this._setSwiping(true)

		return true
	}

	/** Жест кончился. Закрывать или нет, решил плагин жеста. */
	endSwipe(): void {
		this._setSwiping(false)
	}

	/**
	 * Атрибуты кнопки закрытия — отдельный набор, а не часть `aria`: `aria`
	 * описывает тост, а это кнопка в нём. Имя с текстом тоста («Закрыть
	 * Сохранено») пишет плагин имён, за границу core → ui уходит снимок
	 * (`valueOf()`), об изменении набор сообщает `change:closeAria`.
	 */
	get closeAria(): TAria {
		return this._closeAria
	}

	/** Роль живой области: срочное — `alert`, остальное — `status`. */
	protected _syncRole(): void {
		this._aria.add('role', this._alert ? 'alert' : 'status')
	}

	protected _setSwiping(value: boolean): void {
		if (this._swiping === value) return

		this._swiping = value
		this._dataset.add('swiping', value)
		this._sink.emit('change:swiping', value)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this._text,
			description: this._description,
			type: this._type,
			loading: this._loading,
			closable: this._closable,
			duration: this._duration,
			alert: this._alert,
			render: this._render,
		} as TProps
	}
}
