import { TLayer, TCloseEvent, FRAME_LAYER_ATTRIBUTE } from '../layer'
import type { TCloseReason } from '../layer'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { TComponentViewStates } from '../component-view'
import type { TAriaAttributes, TDatasetAttributes, TEventSink } from '../../../common'
import type { IModalLayer, IModalLayerProps, TModalLayerEvents } from './types'

/**
 * Модальный слой — общая база модального окна и выезжающей панели.
 *
 * Паттерн APG у обоих один — Dialog (Modal): панель, сама корень и слой
 * (`TLayer`), объявляет себя `role="dialog"` и `aria-modal="true"`, имя ей
 * даёт заголовок (`aria-labelledby`), подложка — её сосед с тем же номером
 * слоя. Окно и панель различаются раскладкой — место и разворот у окна, край
 * экрана и жест у панели, — а всё, что следует из модальности, общее и живёт
 * здесь один раз: кнопка закрытия, запрос закрытия и размер.
 *
 * Фокус, замкнутый Tab и Escape — у `TModalFocusPlugin`, нажатие мимо — у
 * `TDismissPlugin`, немой для скринридера фон — у `THideOutsidePlugin`,
 * запертая прокрутка — у `TScrollLockPlugin`: здесь только состояние и то,
 * что из него следует для разметки.
 *
 * **Имя — заголовок.** Слот `title` рисуется всегда, и `aria-labelledby`
 * ссылается на него: формула `id` одна на обе стороны связки, и сторону
 * заголовка ядро отдаёт выходом `titleAria` — у разметки без экземпляра
 * набора нет. `TAriaPlugin` модальному слою не ставится: он пишет те же
 * ключи и снял бы связку при установке.
 *
 * **Закрытие пользователем — запрос** (`requestClose`) с причиной: кнопка
 * закрытия, нажатие мимо, Escape или жест панели. Запрос проходит через
 * отменяемое `close:before`, а при `dismissible: false` нажатие мимо и Escape
 * отклоняются без события — остаются кнопка и жест, который потребитель
 * включил сам. Запись `visible` из кода и `v-model` запросом не считаются:
 * родитель, который открытость пишет сам, с панелью не разойдётся. Поэтому
 * не `hide:before` — его шлёт и программное скрытие.
 *
 * **Размер — значение, раскладка — тема.** Ширина и высота уходят теме
 * переменными раскладки наследника (`TDialogLayoutPlugin`,
 * `TDrawerLayoutPlugin`); не заданы — размер выбирает тема.
 *
 * **Открытость — `data-open`** у панели и подложки. По нему тема ведёт
 * переход к закрытому виду и обратно: окно гаснет и проявляется, панель
 * уезжает за край и въезжает. Своего появления и исчезания у ядра нет — ни
 * «присутствия», ни хуков под анимацию: закрытый слой спрятан `visible`, а
 * переход до скрытия и после показа держит CSS.
 */
export default class TModalLayer<
	TProps extends IModalLayerProps = IModalLayerProps,
	TEvents extends TModalLayerEvents = TModalLayerEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
>
	extends TLayer<TProps, TEvents, TStates>
	implements IModalLayer<TProps, TEvents, TStates>
{
	static defaultValues: typeof TLayer.defaultValues &
		TDefaultValues<
			IModalLayerProps,
			'closable' | 'closeLabel' | 'dismissible',
			'width' | 'height'
		> = {
		...TLayer.defaultValues,
		// Не `'auto'`, как у Frame: размер по умолчанию выбирает тема, а
		// `auto` растянул бы окно по экрану
		width: undefined,
		height: undefined,
		closable: true,
		closeLabel: 'Close',
		dismissible: true,
	}

	protected _width: number | string | undefined
	protected _height: number | string | undefined
	protected _closable: boolean
	protected _closeLabel: string
	protected _dismissible: boolean
	/**
	 * `id` заголовка — одна формула на обе стороны связки. Блок берётся у
	 * класса (`s-dialog-title-7`, `s-drawer-title-7`): у двух слоёв на
	 * странице `uid` и так разные, а блок в `id` говорит, чей это заголовок.
	 */
	protected readonly _titleId: string

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		const ctor = new.target as typeof TModalLayer

		super(props, options)

		this._width = props.width ?? ctor.defaultValues.width
		this._height = props.height ?? ctor.defaultValues.height
		this._closable = props.closable ?? ctor.defaultValues.closable
		this._closeLabel = props.closeLabel ?? ctor.defaultValues.closeLabel
		this._dismissible = props.dismissible ?? ctor.defaultValues.dismissible
		this._titleId = `${ctor.baseClass}-title-${this.uid}`

		this._aria.add('role', 'dialog')
		// Слой модален: скринридер вне его не читает. Это значение, а не
		// операция — фон на самих узлах прячет `THideOutsidePlugin`
		this._aria.add('aria-modal', 'true')
		// Имя — заголовок. Ссылка стоит всегда: заголовок рисуется всегда
		this._aria.add('aria-labelledby', this._titleId)

		this._applyOpen()
		this.events.on('change:visible', () => this._applyOpen())
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected override get _sink(): TEventSink<TModalLayerEvents> {
		return this.events
	}

	/**
	 * Пользователь закрывает панель: кнопкой закрытия, нажатием мимо, Escape
	 * или жестом. Нажатие мимо и Escape при `dismissible: false` отклоняются
	 * без события; остальное проходит через отменяемое `close:before`.
	 *
	 * Зовут его кнопка закрытия и плагины слоя. Код, которому нужно просто
	 * закрыть панель, пишет `visible = false`: запросом это не считается.
	 */
	requestClose(reason: TCloseReason): void {
		// Закрывать нечего
		if (!this.visible) return

		// Нажатие мимо и Escape — не повод, если панель закрывается только
		// кнопкой. Жест — повод: его потребитель включает сам
		if (!this._dismissible && (reason === 'outside' || reason === 'escape')) return

		const event = new TCloseEvent(reason)

		this._sink.emit('close:before', event)

		if (event.defaultPrevented) return

		this.hide()
	}

	/**
	 * Ширина панели: число — px, строка — CSS-значение. Не задана — ширину
	 * даёт тема. Значение уходит теме переменной, а не инлайном: потолок по
	 * экрану и развёрнутое окно тема держит сама.
	 */
	get width(): number | string | undefined {
		return this._width
	}

	set width(value: number | string | undefined) {
		if (this._width === value) return

		this._width = value
		this._sink.emit('change:width', value)
	}

	/** Высота панели: число — px, строка — CSS-значение. Не задана — высоту даёт тема. */
	get height(): number | string | undefined {
		return this._height
	}

	set height(value: number | string | undefined) {
		if (this._height === value) return

		this._height = value
		this._sink.emit('change:height', value)
	}

	/**
	 * Показывать ли кнопку закрытия. Без неё панель закрывают нажатие мимо,
	 * Escape (пока `dismissible`), свой жест панели и код.
	 */
	get closable(): boolean {
		return this._closable
	}

	set closable(value: boolean) {
		if (this._closable === value) return

		this._closable = value
		this._sink.emit('change:closable', value)
	}

	/**
	 * Имя кнопки закрытия. Дефолт английский: язык интерфейса ядру неизвестен,
	 * а оставить кнопку без имени нельзя.
	 */
	get closeLabel(): string {
		return this._closeLabel
	}

	set closeLabel(value: string) {
		if (this._closeLabel === value) return

		this._closeLabel = value
		this._sink.emit('change:closeLabel', value)
	}

	/**
	 * Закрывают ли панель нажатие мимо и Escape. Выключено — панель
	 * закрывается только кнопкой закрытия, своим жестом и кодом. Закрыть её
	 * только Escape — отменить `close:before` с причиной `outside`.
	 */
	get dismissible(): boolean {
		return this._dismissible
	}

	set dismissible(value: boolean) {
		if (this._dismissible === value) return

		this._dismissible = value
		this._sink.emit('change:dismissible', value)
	}

	/**
	 * Сторона заголовка в связке с панелью. Отдельный набор, а не часть
	 * `aria`: `aria` описывает панель, а это — вложенный элемент без
	 * экземпляра (AGENTS.md, «Часть или слот»).
	 */
	get titleAria(): TAriaAttributes {
		return { id: this._titleId }
	}

	/** Имя кнопки закрытия — соседней с содержимым, а не самой панели. */
	get closeAria(): TAriaAttributes {
		return { 'aria-label': this._closeLabel }
	}

	/**
	 * `data-*` подложки — тот же номер слоя и та же открытость, что у панели.
	 *
	 * Подложка — сосед панели, и нажатие по ней для плагинов слоя — нажатие
	 * мимо. Но слой бывает открыт поверх слоя, и для нижнего подложка верхнего
	 * — нажатие в слой выше своего, то есть внутри: без номера нажатие по
	 * подложке верхнего окна закрыло бы оба. Пометки владельцем (`data-owner`)
	 * у подложки нет: для своего слоя она — мимо.
	 *
	 * Открытость — чтобы подложка гасла вместе с панелью: экземпляра у неё нет,
	 * и `data-open` ей отдаёт этот набор.
	 */
	get backdropDataset(): TDatasetAttributes {
		const layer = this._dataset.get(FRAME_LAYER_ATTRIBUTE)

		return {
			...(layer === undefined ? {} : { [FRAME_LAYER_ATTRIBUTE]: layer }),
			'data-open': String(this.visible),
		}
	}

	/**
	 * Открытость — теме: по `data-open` она ведёт переход к закрытому виду, и
	 * переходу до скрытия есть к чему идти. Второй записи состояния тут нет —
	 * это проекция `visible` в набор, как `data-open` у Popover.
	 */
	private _applyOpen(): void {
		this._dataset.add('open', this.visible)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			width: this._width,
			height: this._height,
			closable: this._closable,
			closeLabel: this._closeLabel,
			dismissible: this._dismissible,
		}
	}
}
