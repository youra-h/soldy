import { TComponentView } from '../../base/component-view'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { TComponentViewStates } from '../../base/component-view'
import type { TAriaAttributes } from '../../../common'
import type { ITooltip, ITooltipProps, TTooltipEvents, TTooltipPlacement } from './types'

/**
 * Подсказка: короткий неинтерактивный текст у триггера.
 *
 * Паттерн APG — Tooltip. Панель объявляет себя `role="tooltip"`, триггер
 * ссылается на неё `aria-describedby`, фокус остаётся на триггере и в панель
 * не уходит — кнопки закрытия у подсказки нет. Когда показывать и когда
 * прятать (наведение с задержкой, фокус с клавиатуры, нажатие, Escape) —
 * у `TTooltipTriggerPlugin`, нажатие мимо — у `TDismissPlugin`: здесь только
 * состояние и то, что из него следует для разметки.
 *
 * Корень компонента — обёртка триггера и якорь панели, а сама панель — Frame
 * без экземпляра в ядре, как у Popover. Поэтому связку «триггер ↔ панель»
 * Tooltip отдаёт с обеих сторон сам: сторону панели — в свой `aria`, который
 * разметка раскладывает на Frame, сторону триггера — выходом `triggerAria` в
 * scope слота `trigger`. Формула `id` одна на обе.
 *
 * Панель не размонтируется: открытость — это её `visible`. Поэтому ссылка
 * триггера стоит всегда, а не только у открытой подсказки: описание есть уже в
 * первой (и серверной) отрисовке и не запаздывает относительно фокуса. Скрытый
 * узел, на который прямо ссылается `aria-describedby`, в описание входит
 * (accname 1.2, шаг 2A). Отсюда же — `lazyMount` у подсказки быть не может.
 */
export default class TTooltip
	extends TComponentView<ITooltipProps, TTooltipEvents, TComponentViewStates>
	implements ITooltip
{
	static override baseClass = 's-tooltip'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<ITooltipProps, 'open' | 'placement' | 'openDelay' | 'closeDelay'> = {
		...TComponentView.defaultValues,
		// Строчный корень: триггер встаёт и в строку текста, и в ряд кнопок
		tag: 'span',
		open: false,
		// Над триггером: стрелка курсора рисуется ниже своей точки и подсказку
		// под триггером закрывала бы. У края окна сторону переворачивает flip
		placement: 'top-start',
		openDelay: 400,
		// Курсор успевает пересечь зазор между триггером и панелью, а
		// подсказка не висит после того, как с неё ушли
		closeDelay: 150,
	}

	protected _open: boolean
	protected _placement: TTooltipPlacement
	protected _openDelay: number
	protected _closeDelay: number

	constructor(
		props: Partial<ITooltipProps> = {},
		options: IComponentOptions<TComponentViewStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TTooltip

		this._open = props.open ?? ctor.defaultValues.open
		this._placement = props.placement ?? ctor.defaultValues.placement
		this._openDelay = props.openDelay ?? ctor.defaultValues.openDelay
		this._closeDelay = props.closeDelay ?? ctor.defaultValues.closeDelay

		// Сторона панели связки: панель — подсказка, `id` — то, на что ссылается
		// `aria-describedby` триггера. Имени у панели нет: её текст и есть
		// описание триггера
		this._aria.add('role', 'tooltip')
		this._aria.add('id', this._panelId)
	}

	get open(): boolean {
		return this._open
	}

	set open(value: boolean) {
		if (this._open === value) return

		this._open = value
		this.events.emit('change:open', value)
	}

	/**
	 * Сторона и выравнивание панели у триггера. Сторону у края окна считает
	 * плагин якоря Frame (flip и shift) — здесь только выбор потребителя.
	 */
	get placement(): TTooltipPlacement {
		return this._placement
	}

	set placement(value: TTooltipPlacement) {
		if (this._placement === value) return

		this._placement = value
		this.events.emit('change:placement', value)
	}

	/**
	 * Сколько курсор держится на триггере, прежде чем подсказка покажется.
	 * Фокуса с клавиатуры задержка не касается: он показывает подсказку
	 * сразу. Плагин читает её, когда заводит таймер, — новое значение
	 * действует со следующего наведения.
	 */
	get openDelay(): number {
		return this._openDelay
	}

	set openDelay(value: number) {
		if (this._openDelay === value) return

		this._openDelay = value
		this.events.emit('change:openDelay', value)
	}

	/**
	 * Сколько подсказка ждёт после ухода курсора с триггера или панели. За
	 * это время курсор пересекает зазор между ними, и панель под курсором
	 * подсказку удерживает.
	 */
	get closeDelay(): number {
		return this._closeDelay
	}

	set closeDelay(value: number) {
		if (this._closeDelay === value) return

		this._closeDelay = value
		this.events.emit('change:closeDelay', value)
	}

	/**
	 * Сторона триггера в связке с панелью.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает панель, а это —
	 * чужой элемент, триггер потребителя в слоте `trigger`. У разметки без
	 * экземпляра набора нет, атрибуты отдаются значением (AGENTS.md, «Часть
	 * или слот»).
	 *
	 * `aria-describedby` стоит и у закрытой подсказки: панель всегда в
	 * документе, закрытие её только прячет.
	 */
	get triggerAria(): TAriaAttributes {
		return { 'aria-describedby': this._panelId }
	}

	/** `id` панели — одна формула на обе стороны связки. */
	protected get _panelId(): string {
		return `s-tooltip-panel-${this.uid}`
	}

	override getProps(): ITooltipProps {
		return {
			...super.getProps(),
			open: this._open,
			placement: this._placement,
			openDelay: this._openDelay,
			closeDelay: this._closeDelay,
		}
	}
}
