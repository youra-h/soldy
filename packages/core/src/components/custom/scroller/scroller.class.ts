import { TControl } from '../../base/control'
import type { TDefaultValues } from '../../base/component'
import { TAria } from '../../../common'
import type { TAriaAttributes } from '../../../common'
import type {
	IScroller,
	IScrollerProps,
	TScrollerDirection,
	TScrollerEvents,
	TScrollerViewport,
} from './types'

/**
 * Scroller: лента произвольного содержимого в одну строку, которую двигают
 * две кнопки — назад и вперёд. На краю кнопка гаснет.
 *
 * Паттерна APG у ленты нет: «Carousel» в APG — это слайды с
 * `aria-roledescription` и автопрокруткой, а здесь ни слайдов, ни
 * собственного состава. Каруселью такую ленту называет платформа (CSS
 * Overflow 5, `::scroll-button()`), и её модель компонент и повторяет:
 * нативная прокрутка вьюпорта, шаг в страницу, настоящие кнопки,
 * выключенные на краях. Ролей карусели не пишем вовсе — роль ряда приходит
 * от потребителя (`viewportAria`), это его знание, а не ленты.
 *
 * Состава у ленты нет: содержимое — слот, коллекции не заводим. Первый
 * потребитель (ряд тегов) свой набор уже держит, и второй был бы вторым
 * путём к тем же данным.
 *
 * Границы слоёв: **значение — здесь, операция — в плагине**. Где сейчас лента
 * и куда её можно двинуть, знает только DOM, поэтому замер делает
 * `TScrollerViewportPlugin` и сообщает сюда (`notifyViewport`) — тем же
 * приёмом, что `notifyFit` у тегов. Сама прокрутка — тоже его: ядро только
 * просит (`scroll:request`).
 *
 * Имена кнопок — от локали: кнопка со стрелкой без имени для скринридера
 * безымянна, а строки библиотеки задаёт локаль поддерева. Лента держит наборы
 * кнопок (`prevAria`, `nextAria`), имена в них пишет плагин имён
 * (`TScrollerNamesPlugin`).
 */
export default class TScroller
	extends TControl<IScrollerProps, TScrollerEvents>
	implements IScroller
{
	static override baseClass = 's-scroller'

	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<IScrollerProps, never, 'viewportAria'> = {
		...TControl.defaultValues,
		// Роль ряда есть не у всякой ленты: у набора тегов без выбора её нет
		viewportAria: undefined,
	}

	protected _viewportAria: TAriaAttributes | undefined
	protected _prevAria: TAria
	protected _nextAria: TAria
	protected _canPrev = false
	protected _canNext = false
	protected _hasTabStops = false

	constructor(props: Partial<IScrollerProps> = {}) {
		super(props)

		const ctor = new.target as typeof TScroller

		this._viewportAria = props.viewportAria ?? ctor.defaultValues.viewportAria

		// Оба признака стоят с первой отрисовки и значением `"false"`, а не
		// снятым атрибутом: тема отличает «нельзя» от «неприменимо», и от
		// обоих `false` зависит её правило «листать нечего»
		this._dataset.add('can-prev', this._canPrev)
		this._dataset.add('can-next', this._canNext)

		this._prevAria = new TAria()
		this._prevAria.events.on('change', () =>
			this.events.emit('change:prevAria', this._prevAria.toObject()),
		)

		this._nextAria = new TAria()
		this._nextAria.events.on('change', () =>
			this.events.emit('change:nextAria', this._nextAria.toObject()),
		)
	}

	/**
	 * Атрибуты вьюпорта от потребителя — например `role="listbox"` ряда тегов.
	 *
	 * Лента их не разбирает: набор приходит значением и уходит в разметку как
	 * есть. Сравнение по ссылке — объект принадлежит потребителю, и менять его
	 * на месте он не должен (AGENTS.md, «Контракт границы core → ui»).
	 */
	get viewportAria(): TAriaAttributes | undefined {
		return this._viewportAria
	}

	set viewportAria(value: TAriaAttributes | undefined) {
		if (this._viewportAria === value) return

		this._viewportAria = value
		this.events.emit('change:viewportAria', value)
	}

	/** Есть ли куда листать к началу строки. */
	get canPrev(): boolean {
		return this._canPrev
	}

	/** Есть ли куда листать к концу строки. */
	get canNext(): boolean {
		return this._canNext
	}

	/** Есть ли внутри ленты свои остановки Tab. */
	get hasTabStops(): boolean {
		return this._hasTabStops
	}

	/**
	 * Набор кнопки «назад»: своего экземпляра у кнопки нет, и набор держит
	 * лента. Живой: имя пишет плагин имён от локали, об изменении набор
	 * сообщает `change:prevAria`.
	 */
	get prevAria(): TAria {
		return this._prevAria
	}

	/** Набор кнопки «вперёд» — как у «назад». */
	get nextAria(): TAria {
		return this._nextAria
	}

	/**
	 * Выключенность кнопок считает ядро, а не разметка: «выключена лента
	 * **или** упёрлись в край» — одно правило на шесть адаптеров. Тема корень
	 * не гасит, поэтому выключенная лента обязана доехать до кнопок.
	 */
	get prevDisabled(): boolean {
		return this.disabled || !this._canPrev
	}

	get nextDisabled(): boolean {
		return this.disabled || !this._canNext
	}

	/**
	 * `tabindex` вьюпорта: прокручиваемая область обязана быть достижима с
	 * клавиатуры (axe `scrollable-region-focusable`, WCAG 2.1.1) — либо сама,
	 * либо через фокусируемый элемент внутри.
	 *
	 * Поэтому остановкой лента становится, только когда своих остановок внутри
	 * нет: в ряду тегов с выбором это была бы лишняя остановка поверх roving
	 * tabindex. И только когда листать есть куда: у ленты, которая никуда не
	 * двигается, прокручивать нечего (тот же приём, что у вьюпорта Base UI).
	 *
	 * `undefined` — атрибута нет вовсе: `0` и «не остановка» отличаются
	 * присутствием атрибута, а не значением.
	 */
	get viewportTabIndex(): number | undefined {
		if (this._hasTabStops) return undefined

		return this._canPrev || this._canNext ? 0 : undefined
	}

	/**
	 * Замер вьюпорта от плагина: края ленты и остановки Tab внутри.
	 *
	 * Один метод на три факта, потому что источник у них один — проход
	 * плагина по DOM. Событие шлётся только на изменившийся факт: `change:*`
	 * эмитится при реальном изменении.
	 */
	notifyViewport({ canPrev, canNext, hasTabStops }: TScrollerViewport): void {
		if (this._canPrev !== canPrev) {
			this._canPrev = canPrev
			this._dataset.add('can-prev', canPrev)
			this.events.emit('change:canPrev', canPrev)
		}

		if (this._canNext !== canNext) {
			this._canNext = canNext
			this._dataset.add('can-next', canNext)
			this.events.emit('change:canNext', canNext)
		}

		if (this._hasTabStops !== hasTabStops) {
			this._hasTabStops = hasTabStops
			this.events.emit('change:hasTabStops', hasTabStops)
		}
	}

	/** Листнуть к началу строки. */
	scrollPrev(): void {
		this._request('prev')
	}

	/** Листнуть к концу строки. */
	scrollNext(): void {
		this._request('next')
	}

	/**
	 * Просьба листнуть — без прокрутки: где лента и на сколько её двигать,
	 * знает DOM, а не ядро.
	 *
	 * Проверка края и выключенности здесь, а не у плагина: это то же правило,
	 * по которому гаснут кнопки, и второй его экземпляр однажды разошёлся бы
	 * с первым.
	 */
	protected _request(direction: TScrollerDirection): void {
		if (direction === 'prev' ? this.prevDisabled : this.nextDisabled) return

		this.events.emit('scroll:request', direction)
	}

	override getProps(): IScrollerProps {
		return {
			...super.getProps(),
			viewportAria: this._viewportAria,
		}
	}
}
