import { TComponentView } from '../../base/component-view'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { TComponentViewStates } from '../../base/component-view'
import type { TAriaAttributes, TDatasetAttributes } from '../../../common'
import type { IPopover, IPopoverProps, TPopoverEvents, TPopoverPlacement } from './types'

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
 * без экземпляра в ядре: хранить в нём нечего. Поэтому связку «триггер ↔
 * панель» Popover отдаёт с обеих сторон сам: сторону панели — в свой `aria`,
 * который разметка раскладывает на Frame, сторону триггера — выходом
 * `triggerAria` в scope слота `trigger`. Формула `id` одна на обе.
 */
export default class TPopover
	extends TComponentView<IPopoverProps, TPopoverEvents, TComponentViewStates>
	implements IPopover
{
	static override baseClass = 's-popover'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<
			IPopoverProps,
			'open' | 'closable' | 'closeLabel' | 'lazyMount' | 'placement'
		> = {
		...TComponentView.defaultValues,
		// Строчный корень: триггер встаёт и в строку текста, и в ряд тегов
		tag: 'span',
		open: false,
		closable: true,
		closeLabel: 'Close',
		lazyMount: false,
		placement: 'bottom-start',
	}

	protected _open!: boolean
	protected _closable: boolean
	protected _closeLabel: string
	protected _lazyMount: boolean
	protected _placement: TPopoverPlacement
	/** Открывали ли панель хоть раз — после этого `lazyMount` содержимое не прячет. */
	protected _opened = false

	constructor(
		props: Partial<IPopoverProps> = {},
		options: IComponentOptions<TComponentViewStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TPopover

		this._closable = props.closable ?? ctor.defaultValues.closable
		this._closeLabel = props.closeLabel ?? ctor.defaultValues.closeLabel
		this._lazyMount = props.lazyMount ?? ctor.defaultValues.lazyMount
		this._placement = props.placement ?? ctor.defaultValues.placement

		// Сторона панели связки: панель — диалог, `id` — то, на что ссылается
		// `aria-controls` триггера. Имя пишет `TAriaPlugin` в этот же набор
		this._aria.add('role', 'dialog')
		this._aria.add('id', this._panelId)

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
	 * Сторона триггера в связке с панелью.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает панель, а это —
	 * чужой элемент, кнопка потребителя в слоте `trigger`. У разметки без
	 * экземпляра набора нет, атрибуты отдаются значением (AGENTS.md, «Часть
	 * или слот»).
	 *
	 * `aria-haspopup="dialog"`, а не `true`: `true` у ARIA значит `menu`.
	 * `aria-controls` стоит и у закрытой панели — она всегда в документе,
	 * закрытие её только прячет.
	 */
	get triggerAria(): TAriaAttributes {
		return {
			'aria-haspopup': 'dialog',
			'aria-expanded': this._open ? 'true' : 'false',
			'aria-controls': this._panelId,
		}
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

	/** `id` панели — одна формула на обе стороны связки. */
	protected get _panelId(): string {
		return `s-popover-panel-${this.idBase}`
	}

	protected _applyOpen(value: boolean): void {
		this._open = value

		if (value) this._opened = true

		// Тема и потребитель, красящий свой триггер по контексту, читают
		// открытость с корня — как у Select
		this._dataset.add('open', value)
	}

	override getProps(): IPopoverProps {
		return {
			...super.getProps(),
			open: this._open,
			closable: this._closable,
			closeLabel: this._closeLabel,
			lazyMount: this._lazyMount,
			placement: this._placement,
		}
	}
}
