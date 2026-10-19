import type { IFrame, TDefaultValues } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { afterTransitions, isPinnedToViewport, positionOriginOf } from '../../../utils'
import type {
	IAnchorPluginOptions,
	IAnchorPluginProps,
	TAnchorPluginEvents,
	TFramePlacement,
} from './types'

/**
 * Атрибут фактической стороны панели после flip: плагин пишет его в `dataset`
 * Frame. Читают его тема и плагин жеста (`TSwipePlugin`): панель у триггера
 * уходит жестом от него, а под ним она или над ним, знает только её узел.
 *
 * Имя с префиксом `data-`: по нему читают узел, а `dataset` принимает имя с
 * префиксом как есть.
 */
export const ANCHOR_PLACEMENT_ATTRIBUTE = 'data-placement'

/** Сторона панели у якоря — над ним или под ним. */
type TAnchorSide = 'top' | 'bottom'

/** Сторона напротив. */
const opposite = (side: TAnchorSide): TAnchorSide => (side === 'top' ? 'bottom' : 'top')

/**
 * TAnchorPlugin — привязка Frame к чужому элементу.
 *
 * Общий слой для всего, что открывается у чего-то: выпадающий список Select,
 * меню у кнопки, поповер, подсказка. Сам ничего не рисует — вычисляет
 * координаты и пишет их во Frame (`x`, `y`, при `matchWidth` ещё `width`).
 * Дальше их раскладывает `TFrameLayoutPlugin`, как любые другие координаты.
 *
 * Разделение не формальное: раскладка отвечает за собственные пропсы Frame,
 * привязка — за слежение за посторонним элементом. Смешивать их значит
 * заводить в одном плагине два повода меняться.
 *
 * **Место считается, пока панель на экране** — показана или ещё гаснет.
 * Закрытые панели у полей — списки Select, подсказки, меню, календари
 * DatePicker — стоят на странице десятками, и каждая на каждом кадре
 * прокрутки меряла бы свой якорь и писала бы во Frame новый `y`. Поэтому
 * якорь плагин запоминает сразу, а слежение за ним (`_subscribe`) заводит
 * показ Frame, у Frame, созданного видимым, — назначение якоря. Снимает его
 * конец закрытия: когда корень доиграл переходы закрытия
 * (`afterTransitions`), — гаснущая и уходящая жестом панель идёт за полем до
 * конца. Новый показ ожидание отменяет. Снятие якоря и `destroy()` снимают
 * слежение сразу, снятый корень — тоже: панели на экране нет, и ждать её
 * перехода незачем, — а новый корень показанной панели слежение возвращает.
 * Вне слежения место не считает ничто — ни прокрутка, ни наблюдатель панели,
 * ни сеттеры: показ считает его заново. Открытость плагин ведёт сам, по
 * `show` и `hide` своего Frame, а не адаптер: якорь только у открытой панели
 * развёл бы это правило по шести адаптерам.
 *
 * `placement` — сторона (`top`/`bottom`) и выравнивание по якорю: `-start` —
 * по началу, `-end` — по концу, без суффикса — по центру. Поверх этого выбора
 * плагин сам решает две вещи:
 * **flip** — если панель не влезает по высоте с выбранной стороны, а с
 * противоположной места больше, показывает её там; **shift** — сдвигает
 * панель по горизонтали, чтобы она не вылезала за левый и правый край.
 * Границей обоим служит видимая область окна, без классической полосы
 * прокрутки (см. `_viewport`). Оба работают внутри тех же шести вариантов
 * `placement`: flip переключает только сторону — выравнивание, центр в том
 * числе, остаётся, — а shift не меняет `placement` и только ограничивает `x`.
 * Flip выключается свойством `flip` (по умолчанию включён): панель остаётся на
 * стороне потребителя, даже если там не влезает. Shift от него не зависит.
 *
 * У flip есть память. Правило выше только выбирает сторону (`_chooseSide`), а
 * открытая панель свою держит (`_holdSide`): пока на ней влезает — стоит, не
 * влезла — переходит на противоположную, только если влезает там, не влезает
 * нигде — стоит. Правило без памяти скакало: одна и та же граница «снизу
 * влезает» и уводила панель наверх, и возвращала её вниз. На телефоне палец
 * двигает страницу по пикселю туда и обратно, адресная строка браузера
 * прячется и выезжает, и поле всё время стоит на этой границе, а на коротком
 * экране, где панель не влезает нигде, сторона менялась на каждом переходе
 * поля через середину экрана. Так же поступает CSS Anchor Positioning — держит
 * последний удачный вариант. Сторону забывают показ Frame, смена `placement` и
 * `flip`, смена и снятие якоря и `contained`, и следующий расчёт выбирает её
 * заново. Закрытие её не забывает: гаснущая панель держит сторону, как
 * открытая.
 *
 * `RTL` (`getComputedStyle(anchor).direction`) разворачивает `-start`/`-end`:
 * в RTL `-start` выравнивает панель по правому краю якоря, `-end` — по левому.
 * Центр от направления не зависит.
 *
 * Фактическая сторона после flip уходит теме через `data-placement` на самом
 * Frame (`frame.dataset`) — она не всегда совпадает с тем, что задал
 * потребитель в `placement`.
 *
 * `position` панели у якоря выбирает плагин (`_choosePosition`), как пишет
 * её `x` и `y`: `absolute`, а у якоря, который стоит в окне, — `fixed`.
 * Панель `fixed` прокрутку страницы не замечает, и сдвинуть её за полем
 * может только пересчёт по `scroll`. На телефоне страницу прокручивает
 * композитор, а `scroll` приходит в JS кадром позже: поле уже уехало, панель
 * кадр стоит и догоняет — дрожит на каждом кадре прокрутки. Ни кадр
 * (`requestAnimationFrame`), ни память стороны этого не снимают. Панель
 * `absolute` лежит в документе, и окно браузер прокручивает вместе с ней и
 * полем, без JS, — так у PrimeVue. Якорь в окне (`fixed` или `sticky` к
 * окну, `isPinnedToViewport`) прокрутка окна не двигает, и панель `absolute`
 * отставала бы от него наоборот — у него `fixed`. Выбирают заново показ Frame
 * и смена якоря у показанной панели.
 *
 * Внутренняя прокрутка — граница, а не недоделка. Поле в своём прокручиваемом
 * блоке, а панель в `body`: её отставание на кадр снимет только CSS Anchor
 * Positioning, где место считает браузер, — или `target` панели в самом
 * блоке, и тогда она едет вместе с ним.
 *
 * Считается всё в координатах окна (`getBoundingClientRect()`), а во Frame
 * уходит от угла блока, от которого браузер отсчитывает `left`/`top` панели
 * (`positionOriginOf`): у `absolute` в `body` это начало документа, в
 * позиционированном предке — его угол с прокруткой, у `fixed` — окно или
 * предок с трансформацией. Панель внутри контейнера (`contained`) якорь не
 * двигает: её место в контейнере решает тема, и стороны у неё нет —
 * `data-placement` снимается.
 *
 * По той же причине оба наблюдателя (`ResizeObserver`) смотрят border-box:
 * наблюдать надо ровно то, что меряем. Умолчание `content-box` пропустило бы
 * смену одной рамки или паддинга — толщина рамки по состоянию, паддинг по
 * размеру, — и координаты держались бы устаревшими до ближайшего
 * scroll/resize окна.
 */
export class TAnchorPlugin extends TBasePlugin<any, TAnchorPluginEvents> {
	/**
	 * Умолчания пропов плагина. Из них стартуют поля плагина, и их же
	 * `definePlugin` кладёт в декларации пропов: значение живёт в одном месте.
	 * `flip: true` в приватном поле адаптер не увидел бы и отдал бы Frame без
	 * `anchor_flip` своё `false`.
	 *
	 * `anchor: null` — «панель ни к чему не привязана». Якорь не опция, его
	 * задаёт только разметка, но умолчание объявлено и ему: снятый из разметки
	 * проп связка возвращает к умолчанию декларации, и без него панель
	 * оставалась бы привязанной к прежнему элементу.
	 */
	static defaultValues: TDefaultValues<
		IAnchorPluginProps,
		'anchor' | 'placement' | 'matchWidth' | 'flip' | 'offset'
	> = {
		anchor: null,
		placement: 'bottom-start',
		matchWidth: false,
		flip: true,
		offset: 0,
	}

	private _frame: IFrame | null = null
	private _element: Element | null = null
	/** Якорю нужны только `getBoundingClientRect()` и `parentElement` — хватает `Element`. */
	private _anchor: Element | null = TAnchorPlugin.defaultValues.anchor
	private _placement: TFramePlacement = TAnchorPlugin.defaultValues.placement
	private _matchWidth = TAnchorPlugin.defaultValues.matchWidth
	private _flip = TAnchorPlugin.defaultValues.flip
	private _offset = TAnchorPlugin.defaultValues.offset
	private _cleanups: Array<() => void> = []
	private _panelObserver: ResizeObserver | null = null
	/**
	 * Кадр, в котором вернётся наблюдение панели, снятое на уведомление якоря
	 * (см. `_onAnchorResize`); `null` — возвращать нечего.
	 */
	private _panelResumeFrame: number | null = null
	/** Сторона, реально отданная во Frame — по ней решаем, менялся ли `data-placement`. */
	private _actualPlacement: TFramePlacement | null = null
	/**
	 * Сторона, которую держит панель (см. `_holdSide`); `null` — держать
	 * нечего, и сторону выбирает `_chooseSide`.
	 *
	 * Запоминает её только расчёт с разложенной панелью — высотой больше нуля.
	 * На `show` закрытая панель ещё не разложена (`display: none`), а нулевая
	 * высота влезает с любой стороны: запомненная по ней сторона держалась бы
	 * на первом настоящем измерении вместо выбора. Поэтому `_actualPlacement`
	 * памятью не служит — его пишет любой расчёт.
	 */
	private _heldSide: TAnchorSide | null = null
	/**
	 * Слежение идёт: панель показана или ещё гаснет (см. описание класса). Вне
	 * слежения у плагина нет подписок на якорь, и место он не считает.
	 */
	private _following = false
	/** Отмена ожидания конца перехода закрытия; `null` — плагин не ждёт. */
	private _stopWaiting: (() => void) | null = null

	override install(ctx: IPluginContext, options?: IAnchorPluginOptions): void {
		super.install(ctx, options)

		this._placement = options?.placement ?? this._placement
		this._matchWidth = options?.matchWidth ?? this._matchWidth
		this._flip = options?.flip ?? this._flip
		this._offset = options?.offset ?? this._offset
		this._frame = ctx.getInstance<IFrame>() ?? null
		// Frame, созданный видимым, уже на экране, а `show` для него не придёт:
		// за якорем он следит с назначения
		this._following = this._frame?.visible ?? false

		const elementPlugin = ctx.get(TElementPlugin)

		// Размер панели меняется вместе с содержимым (выросший Popover, теги
		// перенеслись) без единого scroll/resize — за ним следит свой наблюдатель.
		// Его колбэк ничего не приостанавливает: `observe()` сразу присылает
		// уведомление, и пауза здесь зациклилась бы (см. `_onAnchorResize`).
		elementPlugin?.events.on('ready', (element) => {
			this._cancelPanelResume()
			this._element = element
			this._panelObserver?.disconnect()
			this._panelObserver = new ResizeObserver(() => this._update())
			this._panelObserver.observe(element, { box: 'border-box' })
			// Показанной панели вернули корень: слежение, снятое на `removed`,
			// возвращается
			if (!this._following && this._frame?.visible) this._follow()
			this._update()
		})

		// Панели на экране нет: ни следить за якорем, ни ждать её перехода
		// закрытия незачем
		elementPlugin?.events.on('removed', () => {
			this._cancelPanelResume()
			this._panelObserver?.disconnect()
			this._panelObserver = null
			this._element = null
			this._unfollow()
		})

		// Панель могла открыться после того, как якорь уже назначен. Сторону
		// показ выбирает заново: прошлое открытие встало там, где было место
		// тогда
		this._listenTo(this._frame?.events, 'show', () => {
			this._heldSide = null
			this._choosePosition()
			this._follow()
			this._update()
		})
		this._listenTo(this._frame?.events, 'hide', () => this._unfollowAfterTransitions())
		this._listenTo(this._frame?.events, 'change:contained', () => this._update())
	}

	/**
	 * Назначает якорь. У закрытой панели якорь только запоминается: место
	 * посчитает показ.
	 */
	setAnchor(element: Element): void {
		if (this._anchor === element) return

		this._anchor = element
		this._heldSide = null

		if (this._following) {
			this._choosePosition()
			this._subscribe()
			this._update()
		}

		this.events.emit('change:anchor', element)
	}

	removeAnchor(): void {
		if (!this._anchor) return

		this._anchor = null
		this._heldSide = null
		this._unsubscribe()
		this._actualPlacement = null
		this._frame?.dataset.add(ANCHOR_PLACEMENT_ATTRIBUTE, null)
		this.events.emit('change:anchor', null)
	}

	get anchor(): Element | null {
		return this._anchor
	}

	get placement(): TFramePlacement {
		return this._placement
	}

	set placement(value: TFramePlacement) {
		if (this._placement === value) return

		this._placement = value
		this._heldSide = null
		this._update()
		this.events.emit('change:placement', value)
	}

	get matchWidth(): boolean {
		return this._matchWidth
	}

	set matchWidth(value: boolean) {
		if (this._matchWidth === value) return

		this._matchWidth = value
		this._update()
		this.events.emit('change:matchWidth', value)
	}

	get flip(): boolean {
		return this._flip
	}

	set flip(value: boolean) {
		if (this._flip === value) return

		this._flip = value
		this._heldSide = null
		this._update()
		this.events.emit('change:flip', value)
	}

	get offset(): number {
		return this._offset
	}

	set offset(value: number) {
		if (this._offset === value) return

		this._offset = value
		this._update()
		this.events.emit('change:offset', value)
	}

	override destroy(): void {
		this._unfollow()

		this._cancelPanelResume()
		this._panelObserver?.disconnect()
		this._panelObserver = null

		this._frame = null
		this._element = null
		this._anchor = null

		super.destroy()
	}

	/**
	 * Считает координаты и кладёт их во Frame.
	 *
	 * Вне слежения не считает ничего: закрытой панели место не нужно, его
	 * посчитает показ (см. описание класса).
	 *
	 * При `matchWidth` ширину панели для `x` и shift даёт якорь (см.
	 * `_panelSize`), а не записанный во Frame `width`: до DOM он доедет только
	 * после рендера адаптера.
	 */
	private _update(): void {
		if (!this._following) return

		const frame = this._frame
		const anchor = this._anchor

		if (frame?.contained) {
			this._heldSide = null
			this._applyPlacement(null)

			return
		}

		if (!frame || !anchor) return

		const rect = anchor.getBoundingClientRect()
		const panel = this._panelSize(rect)

		if (this._matchWidth) frame.width = rect.width

		const rtl = getComputedStyle(anchor).direction === 'rtl'
		const alignment = this._alignment
		const side = this._resolveSide(rect, panel.height)
		const origin = positionOriginOf(this._element, frame.position)

		frame.x = this._resolveX(rect, panel.width, alignment, rtl) - origin.x
		frame.y =
			(side === 'top' ? rect.top - panel.height - this._offset : rect.bottom + this._offset) -
			origin.y

		this._applyPlacement(alignment === 'center' ? side : `${side}-${alignment}`)
	}

	/**
	 * `position` панели: `fixed` у якоря, который стоит в окне, иначе
	 * `absolute` (см. описание класса).
	 *
	 * Выбранное держится до следующего показа или смены якоря. Стили предков
	 * якоря на каждом `scroll` не перечитываем: шапка, которая стала `fixed`
	 * при открытой панели, — редкость, а обход предков со стилями на каждом
	 * кадре прокрутки обошёлся бы всем.
	 */
	private _choosePosition(): void {
		const frame = this._frame
		const anchor = this._anchor

		if (!frame || !anchor) return

		frame.position = isPinnedToViewport(anchor) ? 'fixed' : 'absolute'
	}

	/**
	 * Выравнивание из выбора потребителя: суффикс `-start` или `-end`, а
	 * значение без суффикса (`top`, `bottom`) — центр.
	 */
	private get _alignment(): 'start' | 'center' | 'end' {
		if (this._placement.endsWith('-start')) return 'start'
		if (this._placement.endsWith('-end')) return 'end'

		return 'center'
	}

	/**
	 * Размер видимой области — граница и для flip, и для shift.
	 *
	 * Берём `window.visualViewport`: он знает область без классической полосы
	 * прокрутки, а `innerWidth`/`innerHeight` считают полосу своей, и панель у
	 * самого края окна уезжала под неё полоской примерно в 15px. Тот же выбор
	 * границы у Floating UI для стратегии `fixed`, на которой только и работает
	 * привязка.
	 *
	 * Объекта нет (jsdom, старые браузеры) — остаётся окно.
	 * `document.documentElement.clientWidth` не берём: в jsdom он нулевой, и
	 * юнит-тесты панелей пришлось бы подпирать.
	 *
	 * Смещение видимой области при pinch-zoom (`offsetLeft`/`offsetTop`) не
	 * учитываем — координаты панели отсчитываются от окна. Это осознанная
	 * граница, а не недоделка: сдвинутую лупой область пришлось бы учитывать и
	 * в `y`, и в подписке на её собственные scroll/resize.
	 */
	private get _viewport(): { readonly width: number; readonly height: number } {
		return window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight }
	}

	/**
	 * Сторона (`top`/`bottom`) с учётом flip.
	 *
	 * Выбор потребителя в `_placement` не перетирается — flip живёт только
	 * здесь, в вычислении фактической стороны. С выключенным `flip` сторона
	 * потребителя отдаётся сразу, и память не участвует. Иначе панель держит
	 * запомненную сторону (`_holdSide`), а пока держать нечего, сторону
	 * выбирает правило (`_chooseSide`). Запоминает её только расчёт с
	 * разложенной панелью (см. `_heldSide`).
	 */
	private _resolveSide(rect: DOMRect, panelHeight: number): TAnchorSide {
		if (!this._flip) return this._wantedSide

		const side =
			this._heldSide === null
				? this._chooseSide(rect, panelHeight)
				: this._holdSide(this._heldSide, rect, panelHeight)

		if (panelHeight > 0) this._heldSide = side

		return side
	}

	/**
	 * Сторона из выбора потребителя. Её называет начало значения, а не
	 * префикс `top-`: у центра суффикса нет, и `top` по префиксу с дефисом
	 * уехал бы вниз.
	 */
	private get _wantedSide(): TAnchorSide {
		return this._placement.startsWith('top') ? 'top' : 'bottom'
	}

	/**
	 * Выбор стороны — у панели, которая стороны ещё не держит.
	 *
	 * Сторона потребителя, а если на ней панель не влезает по высоте видимой
	 * области, а на противоположной места больше, — противоположная. Не
	 * влезает нигде — остаёмся на стороне потребителя.
	 */
	private _chooseSide(rect: DOMRect, panelHeight: number): TAnchorSide {
		const wants = this._wantedSide
		const needed = panelHeight + this._offset
		const spaceWanted = this._spaceAt(wants, rect)
		const spaceOpposite = this._spaceAt(opposite(wants), rect)

		if (spaceWanted >= needed || spaceOpposite <= spaceWanted) return wants

		return opposite(wants)
	}

	/**
	 * Удержание стороны: панель стоит на ней, пока там влезает. Не влезла —
	 * переходит на противоположную, только если влезает там; не влезает
	 * нигде — остаётся.
	 *
	 * Правило выбора для этого не годится: граница у него одна — «на стороне
	 * потребителя влезает», а когда не влезает нигде, — середина экрана, — и
	 * поле, которое стоит на ней, переводило бы панель туда и обратно на
	 * каждом пикселе прокрутки. У удержания границы две — «здесь перестала
	 * влезать» и «там влезает», — и между ними панель стоит, где стоит. Запас
	 * между границами — не подобранное число пикселей, а вся полоса, где
	 * панель влезает с обеих сторон или ни с одной.
	 */
	private _holdSide(side: TAnchorSide, rect: DOMRect, panelHeight: number): TAnchorSide {
		const needed = panelHeight + this._offset

		if (this._spaceAt(side, rect) >= needed) return side

		return this._spaceAt(opposite(side), rect) >= needed ? opposite(side) : side
	}

	/** Место по высоте видимой области над якорем (`top`) или под ним (`bottom`). */
	private _spaceAt(side: TAnchorSide, rect: DOMRect): number {
		return side === 'top' ? rect.top : this._viewport.height - rect.bottom
	}

	/**
	 * Левый край панели с учётом выравнивания, RTL и shift.
	 *
	 * После выравнивания (`_alignX`) `x` сдвигается внутрь видимой области по
	 * горизонтали, чтобы панель не вылезала ни слева, ни справа — если панель
	 * шире области, прижимается к левому краю. Центр сдвигается так же, как
	 * начало и конец: у края окна панель перестаёт стоять по центру якоря, но
	 * остаётся видна целиком.
	 */
	private _resolveX(
		rect: DOMRect,
		panelWidth: number,
		alignment: 'start' | 'center' | 'end',
		rtl: boolean,
	): number {
		const x = this._alignX(rect, panelWidth, alignment, rtl)
		const maxX = Math.max(0, this._viewport.width - panelWidth)

		return Math.min(Math.max(x, 0), maxX)
	}

	/**
	 * Левый край панели по выравниванию, до shift.
	 *
	 * Центр — середина якоря минус половина панели, от направления он не
	 * зависит. Начало и конец логические: в LTR `start` — левый край якоря,
	 * `end` — правый, в RTL наоборот.
	 */
	private _alignX(
		rect: DOMRect,
		panelWidth: number,
		alignment: 'start' | 'center' | 'end',
		rtl: boolean,
	): number {
		if (alignment === 'center') return (rect.left + rect.right - panelWidth) / 2

		const alignRight = rtl ? alignment === 'start' : alignment === 'end'

		return alignRight ? rect.right - panelWidth : rect.left
	}

	/** Пишет фактическую сторону во Frame, только если она изменилась. */
	private _applyPlacement(placement: TFramePlacement | null): void {
		if (this._actualPlacement === placement) return

		this._actualPlacement = placement
		this._frame?.dataset.add(ANCHOR_PLACEMENT_ATTRIBUTE, placement)
	}

	/**
	 * Размер панели. Нужен для выравнивания по правому краю и по центру, для
	 * показа сверху и для shift — везде координата отсчитывается от размера
	 * панели, а не только от якоря.
	 *
	 * Берём `getBoundingClientRect()`, а не `offsetWidth`/`offsetHeight`:
	 * оба нулевые, пока `v-show` держит панель на `display: none`, но
	 * `getBoundingClientRect()` пересчитывается уже на первом кадре после
	 * того, как её сняли — раньше на это полагаться было нельзя, теперь за
	 * этим кадром следит `ResizeObserver`.
	 *
	 * При `matchWidth` ширина берётся из якоря, а не из DOM: во Frame она уже
	 * записана, но узел получит её только после рендера адаптера, а панели ещё
	 * может не быть вовсе. Поэтому список под полем не зависит от того,
	 * отрисовалась ли панель, и с `*-end` не мигает по устаревшей ширине.
	 * Высоту якорь не знает — она всегда из DOM.
	 */
	private _panelSize(anchorRect: DOMRect): { width: number; height: number } {
		const panel = this._element?.getBoundingClientRect()

		return {
			width: this._matchWidth ? anchorRect.width : (panel?.width ?? 0),
			height: panel?.height ?? 0,
		}
	}

	/**
	 * Заводит слежение: показ Frame, у Frame, созданного видимым, —
	 * назначение якоря (см. описание класса). Ожидание конца закрытия
	 * отменяется: панель снова открыта.
	 */
	private _follow(): void {
		this._stopWaitingTransitions()
		this._following = true
		this._subscribe()
	}

	/** Снимает слежение сразу — вместе с ожиданием конца закрытия, если оно шло. */
	private _unfollow(): void {
		this._stopWaitingTransitions()
		this._following = false
		this._unsubscribe()
	}

	/**
	 * Закрытие снимает слежение, когда корень доиграет переходы закрытия:
	 * гаснущая и уходящая жестом панель ещё на экране и идёт за полем до
	 * конца. Снятое прямо на `hide`, слежение оставило бы её стоять, пока поле
	 * уезжает. Корня нет — ждать нечего, и слежение снимается сразу.
	 */
	private _unfollowAfterTransitions(): void {
		if (!this._following) return

		const element = this._element

		if (!element) {
			this._unfollow()

			return
		}

		this._stopWaitingTransitions()
		this._stopWaiting = afterTransitions(element, () => {
			this._stopWaiting = null
			this._unfollow()
		})
	}

	/** Отменяет ожидание конца закрытия. */
	private _stopWaitingTransitions(): void {
		this._stopWaiting?.()
		this._stopWaiting = null
	}

	/**
	 * Следит за скроллом предков якоря, ресайзом окна и изменением размера
	 * самого якоря (без скролла — например, у него пропал соседний тег).
	 * Scroll и resize пересчитывают координаты сразу, уведомление наблюдателя
	 * якоря — через `_onAnchorResize`.
	 *
	 * Подписки живут только при слежении (`_follow`, смена якоря у показанной
	 * панели): у закрытой панели их нет вовсе. Прежние снимаются первыми, и
	 * повторный показ второго набора не заводит.
	 *
	 * Каждый слушатель снимается по своей ссылке на элемент: одна переменная
	 * цикла, захваченная всеми замыканиями, к моменту очистки была бы уже
	 * `null`, и слушатели остались бы висеть.
	 */
	private _subscribe(): void {
		this._unsubscribe()

		if (!this._anchor) return

		const update = () => this._update()

		for (let el = this._anchor.parentElement; el; el = el.parentElement) {
			const target = el

			target.addEventListener('scroll', update, { passive: true })
			this._cleanups.push(() => target.removeEventListener('scroll', update))
		}

		window.addEventListener('resize', update, { passive: true })
		window.addEventListener('scroll', update, { passive: true })

		this._cleanups.push(() => {
			window.removeEventListener('resize', update)
			window.removeEventListener('scroll', update)
		})

		const anchorObserver = new ResizeObserver(() => this._onAnchorResize())

		anchorObserver.observe(this._anchor, { box: 'border-box' })
		this._cleanups.push(() => anchorObserver.disconnect())
	}

	private _unsubscribe(): void {
		for (const cleanup of this._cleanups) cleanup()

		this._cleanups = []
	}

	/**
	 * Пересчёт по уведомлению наблюдателя якоря — с паузой в наблюдении панели.
	 *
	 * Колбэк `ResizeObserver` выполняется внутри шага наблюдения кадра, и
	 * записанные здесь `x`, `y` и `width` адаптер успевает отрисовать тут же, в
	 * микрозадаче после колбэка. При `matchWidth` от этого в том же шаге
	 * меняется размер панели. Панель телепортирована и в DOM лежит мельче
	 * якоря, а после уведомления якоря браузер в этом шаге доставляет только
	 * уведомления узлов глубже него. Уведомление панели пропускается: на
	 * `window` уходит `error` («ResizeObserver loop completed with undelivered
	 * notifications»), который получают трекеры ошибок у потребителя, а позиция
	 * по новому размеру панели запаздывает на кадр.
	 *
	 * Поэтому наблюдение панели снимается до пересчёта и возвращается следующим
	 * кадром — приём `autoUpdate` из Floating UI. Вернувшееся наблюдение само
	 * присылает текущий размер: если от новой ширины выросла высота (перенос
	 * текста у панели сверху), `y` поправится по нему. Возвращать микрозадачей
	 * нельзя: она попадёт в тот же шаг, и уведомление снова пропустится.
	 *
	 * Пауза только у якоря. Колбэк панели ничего не приостанавливает:
	 * `observe()` сразу присылает уведомление, и пауза на нём зациклилась бы.
	 * Scroll и resize окна, сеттеры и `show` выполняются вне шага наблюдения, им
	 * пауза не нужна.
	 */
	private _onAnchorResize(): void {
		this._pausePanel()
		this._update()
	}

	/**
	 * Снимает наблюдение панели до следующего кадра.
	 *
	 * Возврат один: повторное уведомление до кадра второго не заводит, иначе
	 * отмена застала бы только последний. Отменяют возврат `removed`, новый
	 * `ready` и `destroy` — то, что убирает или меняет саму панель. Снятие якоря
	 * и конец закрытия (`removeAnchor`, `_unsubscribe`) его не отменяют: панель
	 * осталась, и без возврата за её размером никто бы не следил.
	 */
	private _pausePanel(): void {
		const observer = this._panelObserver
		const element = this._element

		if (!observer || !element) return

		observer.unobserve(element)

		if (this._panelResumeFrame !== null) return

		this._panelResumeFrame = requestAnimationFrame(() => {
			this._panelResumeFrame = null
			observer.observe(element, { box: 'border-box' })
		})
	}

	/** Отменяет отложенный возврат наблюдения панели. */
	private _cancelPanelResume(): void {
		if (this._panelResumeFrame === null) return

		cancelAnimationFrame(this._panelResumeFrame)
		this._panelResumeFrame = null
	}
}
