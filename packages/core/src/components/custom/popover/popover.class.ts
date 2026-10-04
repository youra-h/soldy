import { TComponentView } from '../../base/component-view'
import type { TDefaultValues } from '../../base/component'
import type { TSwipe, TSwipeSide } from '../../base/layer'
import { TAria } from '../../../common'
import type { TAriaAttributes, TDatasetAttributes } from '../../../common'
import type {
	IPopover,
	IPopoverProps,
	TPopoverEdge,
	TPopoverEvents,
	TPopoverPlacement,
} from './types'

/**
 * Поповер: панель с произвольным содержимым у триггера.
 *
 * Паттерн APG — немодальный Dialog. Панель объявляет себя `role="dialog"`,
 * имя ей даёт `TAriaPlugin` (`aria_label`, `aria_labelledBy`), фокус при
 * открытии уходит внутрь, а страница за панелью остаётся доступной: ни
 * ловушки фокуса, ни `aria-modal`. Модель фокуса, Escape и Tab — у
 * `TPopoverFocusPlugin`, клик по триггеру — у `TPopoverPointerPlugin`,
 * нажатие мимо — у `TDismissPlugin`: здесь только состояние и то, что из
 * него следует для разметки.
 *
 * Роли и клавиатуры содержимого у поповера нет: список у Select, меню у Menu,
 * теги у набора тегов — это содержимое, и они остаются за ним.
 *
 * Корень компонента — обёртка триггера и якорь панели, а сама панель — Frame
 * без экземпляра в ядре: хранить в нём нечего. Поэтому обе стороны связки
 * «триггер ↔ панель» — наборы Popover: панели — свой `aria`, который разметка
 * раскладывает на Frame, триггеру — `triggerAria` в scope слота `trigger`.
 * Здесь в них роль и открытость, а `id` панели и ссылку на него пишет плагин
 * `TPopoverIdsPlugin`: `id` нужны документу, а не поповеру.
 *
 * **Жест** (`swipe`, по умолчанию выключен) — смахнуть панель, чтобы закрыть:
 * поповер — смахиваемый слой (`ISwipeable`), тянет его `TSwipePlugin`, общий
 * с выезжающей панелью. Панель у триггера уходит от него — вниз, если стоит
 * под триггером, и вверх, если над ним. Сторону решает flip плагина якоря, и
 * знает её только узел панели, поэтому `swipeSide` у такой панели — `null`.
 * Панель внутри контейнера прижата к краю (`edge`) и уходит к нему. Признак «тянут» (`swiping`) панель
 * получает набором `panelDataset`: корень поповера — не панель, и `dataset`
 * лежит на корне. Закрывает жест записью `open`, как Escape.
 */
export default class TPopover
	extends TComponentView<IPopoverProps, TPopoverEvents>
	implements IPopover
{
	static override baseClass = 's-popover'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<
			IPopoverProps,
			| 'open'
			| 'closable'
			| 'closeLabel'
			| 'lazyMount'
			| 'placement'
			| 'contained'
			| 'edge'
			| 'swipe'
		> = {
		...TComponentView.defaultValues,
		// Строчный корень: триггер встаёт и в строку текста, и в ряд тегов
		tag: 'span',
		open: false,
		closable: true,
		closeLabel: 'Close',
		lazyMount: false,
		placement: 'bottom-start',
		contained: false,
		// Снизу, как лист снизу на телефоне: панель смахивают вниз
		edge: 'bottom',
		swipe: 'none',
	}

	protected _open!: boolean
	protected _closable: boolean
	protected _closeLabel: string
	protected _lazyMount: boolean
	protected _placement: TPopoverPlacement
	protected _contained: boolean
	protected _edge: TPopoverEdge
	protected _swipe: TSwipe
	protected _swiping = false
	/** Открывали ли панель хоть раз — после этого `lazyMount` содержимое не прячет. */
	protected _opened = false
	protected _triggerAria: TAria

	constructor(props: Partial<IPopoverProps> = {}) {
		super(props)

		const ctor = new.target as typeof TPopover

		this._closable = props.closable ?? ctor.defaultValues.closable
		this._closeLabel = props.closeLabel ?? ctor.defaultValues.closeLabel
		this._lazyMount = props.lazyMount ?? ctor.defaultValues.lazyMount
		this._placement = props.placement ?? ctor.defaultValues.placement
		this._contained = props.contained ?? ctor.defaultValues.contained
		this._edge = props.edge ?? ctor.defaultValues.edge
		this._swipe = props.swipe ?? ctor.defaultValues.swipe

		// Сторона панели связки: панель — диалог. Имя пишет `TAriaPlugin` в
		// этот же набор
		this._aria.add('role', 'dialog')

		this._triggerAria = new TAria()

		this._triggerAria.events.on('change', () =>
			this.events.emit('change:triggerAria', this._triggerAria.toObject()),
		)

		// `dialog`, а не `true`: `true` у ARIA значит `menu`
		this._triggerAria.add('aria-haspopup', 'dialog')

		this._applyOpen(props.open ?? ctor.defaultValues.open)
	}

	get open(): boolean {
		return this._open
	}

	set open(value: boolean) {
		if (this._open === value) return

		this._applyOpen(value)
		this.events.emit('change:open', value)
	}

	/**
	 * Показывать ли кнопку закрытия. Без неё панель закрывают нажатие мимо,
	 * Escape, повторный клик по триггеру и само содержимое через `open`.
	 */
	get closable(): boolean {
		return this._closable
	}

	set closable(value: boolean) {
		if (this._closable === value) return

		this._closable = value
		this.events.emit('change:closable', value)
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
		this.events.emit('change:closeLabel', value)
	}

	/**
	 * Не монтировать содержимое, пока панель не открывали. Размонтировать при
	 * закрытии нельзя: открытость — это `visible` панели, а не `rendered`
	 * (AGENTS.md, «Слой оверлея»), иначе закрытие вычищало бы состояние
	 * содержимого. Поэтому после первого открытия переключается только
	 * видимость.
	 */
	get lazyMount(): boolean {
		return this._lazyMount
	}

	set lazyMount(value: boolean) {
		if (this._lazyMount === value) return

		this._lazyMount = value
		this.events.emit('change:lazyMount', value)
	}

	/**
	 * Сторона и выравнивание панели у триггера. Сторону у края окна считает
	 * плагин якоря Frame (flip и shift) — здесь только выбор потребителя.
	 */
	get placement(): TPopoverPlacement {
		return this._placement
	}

	set placement(value: TPopoverPlacement) {
		if (this._placement === value) return

		this._placement = value
		this.events.emit('change:placement', value)
	}

	/**
	 * Панель внутри контейнера: не телепортируется в `body` и не привязывается
	 * к триггеру, а прижимается к краю (`edge`) ближайшего позиционированного
	 * предка — так панель выбора месяца и года выезжает сверху календаря.
	 * Поведение поповера то же: связка с триггером, Escape, нажатие мимо,
	 * фокус. Разметка отдаёт значение панели (Frame), раскладку держит тема.
	 */
	get contained(): boolean {
		return this._contained
	}

	set contained(value: boolean) {
		if (this._contained === value) return

		this._contained = value
		this.events.emit('change:contained', value)
		// Место панели решает, куда она уходит жестом
		this.events.emit('change:swipeSide', this.swipeSide)
	}

	/**
	 * Край контейнера, к которому прижата панель внутри него (`contained`). К
	 * нему же панель уходит жестом, а полоса встаёт у противоположного края —
	 * там, откуда панель тянут. Панель у триггера края не читает: её сторону
	 * решает flip плагина якоря.
	 */
	get edge(): TPopoverEdge {
		return this._edge
	}

	set edge(value: TPopoverEdge) {
		if (this._edge === value) return

		this._edge = value
		this.events.emit('change:edge', value)

		// Сторона ухода сменилась только у панели в контейнере
		if (this._contained) this.events.emit('change:swipeSide', this.swipeSide)
	}

	/**
	 * За что панель можно смахнуть, чтобы закрыть: ни за что (по умолчанию), за
	 * полосу или за любое место, кроме контролов и прокручиваемых областей.
	 */
	get swipe(): TSwipe {
		return this._swipe
	}

	set swipe(value: TSwipe) {
		if (this._swipe === value) return

		this._swipe = value

		// Жест выключили посреди жеста — тянуть больше нечего
		if (value === 'none') this._setSwiping(false)

		this.events.emit('change:swipe', value)
	}

	/**
	 * Куда панель уходит жестом. Внутри контейнера — к своему краю (`edge`). У
	 * триггера — от него, но под ним или над ним панель встаёт по решению flip
	 * плагина якоря, и знает это только её узел: здесь `null`.
	 */
	get swipeSide(): TSwipeSide | null {
		return this._contained ? this._edge : null
	}

	/** Идёт жест: с `beginSwipe` до `endSwipe` или до закрытия панели. */
	get swiping(): boolean {
		return this._swiping
	}

	/**
	 * Рисовать ли полосу, за которую панель тянут. Рисуется, пока жест включён,
	 * — и при `panel` тоже: она говорит, что панель можно смахнуть.
	 */
	get handleRendered(): boolean {
		return this._swipe !== 'none'
	}

	/**
	 * Жест начался: панель тянут. Закрытую панель и панель без жеста тянуть
	 * нельзя — тогда жест не начинается.
	 */
	beginSwipe(): boolean {
		if (this._swipe === 'none' || !this._open) return false

		this._setSwiping(true)

		return true
	}

	/**
	 * Жест кончился. Закрывать или нет, решил плагин по пройденному пути и
	 * скорости, и закрывает он записью `open`, как Escape.
	 */
	endSwipe(): void {
		this._setSwiping(false)
	}

	/**
	 * Сторона триггера в связке с панелью.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает панель, а это —
	 * чужой элемент, кнопка потребителя в слоте `trigger`. Экземпляра у неё
	 * нет, поэтому набор — Popover'а (AGENTS.md, «Часть или слот»).
	 *
	 * Живой, как `aria`, потому что пишут в него двое: `aria-haspopup` и
	 * `aria-expanded` — Popover, `aria-controls` — `TPopoverIdsPlugin`. За
	 * границу core → ui уходит снимок (`valueOf()`), об изменении набор
	 * сообщает `change:triggerAria`.
	 */
	get triggerAria(): TAria {
		return this._triggerAria
	}

	/**
	 * Состояние триггера для темы: открытый триггер выглядит нажатым.
	 *
	 * `data-selected`, а не `data-open`: имя описывает вид, а не механизм, —
	 * как у активного таба. Button уже красит `[data-selected='true']` фоном
	 * нажатия своего вида, и своего CSS триггеру не нужно. Набор отдельный от
	 * `triggerAria`: ARIA и `data-*` в один набор не смешиваются.
	 */
	get triggerDataset(): TDatasetAttributes {
		return { 'data-selected': this._open ? 'true' : 'false' }
	}

	/**
	 * Состояние панели для темы: открыта ли она (`data-open`) — по нему тема
	 * проявляет и гасит панель переходом, без хуков под анимацию, как у
	 * Dialog, — и тянут ли её (`data-swiping`): тогда переход сдвига снят, и
	 * панель идёт за пальцем без задержки. У панели внутри
	 * контейнера — ещё её край (`data-edge`): по нему тема прижимает панель и
	 * ставит полосу жеста. У панели у триггера края нет — свою сторону она
	 * получает от плагина якоря (`data-placement`).
	 *
	 * Отдельный набор, а не `dataset`: корень поповера — обёртка триггера, а
	 * панель — Frame без экземпляра в ядре, и её `data-*` раскладывает разметка,
	 * как `aria` панели.
	 */
	get panelDataset(): TDatasetAttributes {
		const state = {
			'data-open': this._open ? 'true' : 'false',
			'data-swiping': this._swiping ? 'true' : 'false',
		}

		return this._contained ? { ...state, 'data-edge': this._edge } : state
	}

	/** Имя кнопки закрытия — соседней с содержимым, а не самой панели. */
	get closeAria(): TAriaAttributes {
		return { 'aria-label': this._closeLabel }
	}

	/**
	 * Смонтировано ли содержимое панели: без `lazyMount` — всегда, с ним —
	 * после первого открытия.
	 */
	get contentRendered(): boolean {
		return !this._lazyMount || this._opened
	}

	protected _applyOpen(value: boolean): void {
		this._open = value

		if (value) this._opened = true

		// Закрытую панель не тянут: жест кончается вместе с ней
		if (!value) this._setSwiping(false)

		this._triggerAria.add('aria-expanded', value ? 'true' : 'false')

		// Тема и потребитель, красящий свой триггер по контексту, читают
		// открытость с корня — как у Select
		this._dataset.add('open', value)
	}

	protected _setSwiping(value: boolean): void {
		if (this._swiping === value) return

		this._swiping = value
		this.events.emit('change:swiping', value)
	}

	override getProps(): IPopoverProps {
		return {
			...super.getProps(),
			open: this._open,
			closable: this._closable,
			closeLabel: this._closeLabel,
			lazyMount: this._lazyMount,
			placement: this._placement,
			contained: this._contained,
			edge: this._edge,
			swipe: this._swipe,
		}
	}
}
