import { batchOf, drawOf } from '@soldy-ui/core'
import type { IControl, TCollectionEngine, TEventSink } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import type { IDomEventTarget } from '../../../utils'
import { TListItemPlugin } from '../item'
import type { TListEdge, TListNavigationPluginEvents } from './types'

/**
 * Можно ли подсветить элемент: он доступен и виден. Подсветить то, что нельзя
 * выбрать, значит завести пользователя в тупик. `disabled` — итог, в нём учтён
 * и выключенный владелец.
 */
const isNavigable = (item: IControl): boolean => !item.disabled && item.rendered && item.visible

/** Причина закрепления элемента в окне коллекции — на нём подсветка. */
const HIGHLIGHT = 'highlight'

/**
 * TListNavigationPlugin — общая механика навигации по коллекции с клавиатуры.
 *
 * Здесь всё, что не зависит от роли элемента и модели фокуса: подписка на
 * `keydown`, привязка к движку коллекции, учёт подсвеченного элемента,
 * циклический сдвиг и пропуск недоступных элементов. Что делают конкретные
 * клавиши и что означает активация — дело наследника.
 *
 * Граница проведена именно так не из аккуратности. `ListBox` — самостоятельный
 * фокусируемый виджет: фокус держит узел списка. `Select` — combobox, у
 * которого фокус не уходит с поля. Элемент под стрелками оба объявляют через
 * `aria-activedescendant` узла с фокусом, но узел, роли (`option` против
 * `option` в другом контейнере), набор клавиш и смысл активации у них разные,
 * и попытка выразить это режимами одного плагина заставила бы его тесты
 * охранять два поведения сразу.
 *
 * Подсветка — не выбор. Она визуальна, живёт только во время навигации и в
 * значение не попадает; хранится в `TListItemPlugin` каждого элемента.
 *
 * **Позиция и видимая подсветка — разные вещи.** Позиция встаёт на элемент и
 * без отметки: за выбором и на строку, с которой пришла клавиша
 * (`trackHighlight`). О том, что видно на экране, навигация сообщает одним
 * приватным методом сразу двоим: событием `change:highlight` — тем, кто
 * слушает снаружи (прокрутка списка `TListScrollPlugin`, разметка Select), —
 * и хуком `onHighlightChanged` — наследнику. Элемент — когда отметка встала,
 * в том числе на месте, где позиция уже стояла без неё; `null` — когда
 * видимая отметка ушла: подсветку сняли или позиция ушла без отметки. Позиция
 * без отметки переезжает молча: экран не меняется, и прокручивать к ней
 * нечего. У Select и меню позиция всегда с отметкой — для них событие одно с
 * переездом позиции.
 *
 * **Ссылка на подсвеченный элемент** (`aria-activedescendant`) повторяет
 * экран: она есть, пока у элемента видна отметка и он в документе. `id` для
 * ссылки отдаёт `highlightedId()`, а куда её писать, решает наследник по хуку:
 * туда, где фокус.
 *
 * **В окне** (обёртка `Virtual`) в документе только видимые элементы, и у
 * ненарисованного нет ни узла, ни `TListItemPlugin`. Поэтому элемент позиции
 * навигация закрепляет в рисовании коллекции (`draw.pin`): окно рисует его на
 * месте, даже когда стрелка увела подсветку за видимую полосу, и до кадра, в
 * котором его прокручивают к глазу. Отметку заново
 * смонтированному элементу навигация возвращает при регистрации его набора:
 * прежний набор ушёл вместе с узлом. Тогда же наследник узнаёт, что
 * подсвеченный элемент вошёл в документ (`onHighlightedMounted`): то, что есть
 * только у смонтированного элемента, — `id` и узел — появилось у него только
 * сейчас.
 *
 * Элемент списка — `TItem`. Навигации хватает `IControl`, а наследник
 * называет элемент своего списка: этим типом подсвеченный ждёт расширение,
 * через которое идёт выбор (`list.chooseItem` у ListBox, `select.chooseItem`
 * у Select). `any` в констрейнте — карта событий элемента инвариантна, и
 * точный `IControl` не принял бы элемент со своими событиями.
 */
export abstract class TListNavigationPlugin<
	TEvents extends TListNavigationPluginEvents = TListNavigationPluginEvents,
	TItem extends IControl<any, any> = IControl,
> extends TBasePlugin<any, TEvents> {
	/** Узел нужен только под слушатель клавиш — отсюда и тип. */
	protected _element: IDomEventTarget | null = null
	protected _bundles: TCollectionBundlesPlugin | null = null
	protected _engine: TCollectionEngine<any, any> | null = null
	protected _highlightedUid: string | number | null = null
	/** Подсветка видна: у подсвеченного элемента стоит отметка, а не одна позиция. */
	private _marked = false

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null

		// Подсвеченный элемент смонтировали заново — окно вернуло его в документ,
		// а отметка ушла вместе с прежним набором
		this._bundles?.events.on('bundle:registered', ({ uid, bundle }) => {
			if (!this._marked || uid !== this._highlightedUid) return

			const plugin = bundle.get(TListItemPlugin)

			if (plugin) plugin.highlighted = true

			this.onHighlightedMounted(uid)
		})

		ctx.get(TElementPlugin)?.events.on('ready', (element: IDomEventTarget) => {
			this._element = element
			element.addEventListener('keydown', this._onKeyDown)
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element?.removeEventListener('keydown', this._onKeyDown)
			this._element = null
		})

		this._bundles?.events.on('engine:bound', (engine) => {
			this._engine = engine
			this.onEngineBound(engine)
		})
	}

	/**
	 * Эмит собственных событий навигации — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `@soldy-ui/core`).
	 *
	 * Перекрывает сток базы, потому что у `TBasePlugin._sink` карта
	 * `TPluginEvents`, а `change:highlight` объявлен здесь: через базовый сток
	 * это имя не пройдёт. Свой сток заводит каждый уровень иерархии, который
	 * добавил событие; `TListKeyboardPlugin` и `TSelectKeyboardPlugin` к механике
	 * навигации ничего не добавляют и пользуются этим.
	 *
	 * Дженерик карту не заменяет. На `TEventSink<TEvents>` эмит упирается в
	 * `Parameters<TEvents['change:highlight']>` — тип, который на
	 * непроинстанцированном дженерике не разрешается. Вынести карту отдельным
	 * параметром базы тоже не выход: ошибка переезжает в базу, где этот параметр
	 * снова дженерик. Сток обязан назвать карту точно — тем он и отличается от
	 * `this.events`.
	 *
	 * Расширять карту базы безопасно: наследник не может сузить обработчик
	 * (`TEvents extends TListNavigationPluginEvents` сверяется контравариантно по
	 * аргументам), поэтому эмит базы через расширенный сток звучит.
	 */
	protected override get _sink(): TEventSink<TListNavigationPluginEvents> {
		return this.events
	}

	override destroy(): void {
		this._element?.removeEventListener('keydown', this._onKeyDown)
		this.clearHighlight()

		this._element = null
		this._bundles = null
		this._engine = null

		super.destroy()
	}

	/** Элемент, на котором сейчас подсветка. */
	get highlightedUid(): string | number | null {
		return this._highlightedUid
	}

	/* ---------------------------------------------------------------- */
	/* Наследник обязан или может переопределить                          */
	/* ---------------------------------------------------------------- */

	/** Что делают клавиши. */
	protected abstract onKeyDown(event: KeyboardEvent): void

	/** Коллекция появилась — можно синхронизировать начальное состояние. */
	protected onEngineBound(_engine: TCollectionEngine<any, any>): void {}

	/**
	 * Видимая подсветка сменилась — тем же сообщением, что `change:highlight`.
	 * Здесь наследник ведёт ссылку `aria-activedescendant` или фокус; прокрутку
	 * к подсвеченному ведёт `TListScrollPlugin` по событию.
	 *
	 * `uid` — элемент, который получил отметку. Переход с элемента на элемент —
	 * один вызов, с новым: прежняя отметка снимается молча, а `null` между ними
	 * у меню увёл бы фокус на панель. `null` — отметки больше нет: подсветку
	 * сняли (`clearHighlight`) или позиция ушла без отметки (`trackHighlight`).
	 * Без отметки позиция переезжает молча: экран при этом не меняется.
	 */
	protected onHighlightChanged(_uid: string | number | null): void {}

	/**
	 * Подсвеченный элемент вошёл в документ — его набор зарегистрирован, а
	 * отметка ему возвращена. Так бывает в окне: подсветка ушла к элементу,
	 * которого окно не рисовало, и окно дорисовало его уже после
	 * `onHighlightChanged`. Здесь наследник берёт то, что есть только у
	 * смонтированного элемента: `id` для ссылки на него. Прокрутка к нему ждёт
	 * его набор сама (`TListScrollPlugin`).
	 */
	protected onHighlightedMounted(_uid: string | number): void {}

	/**
	 * Показанные элементы — `batch.shown`, а не `batch.items`: ходить
	 * стрелками по тому, что отбор скрыл, нельзя. Среди них и недоступные: по
	 * ним наследник узнаёт, с чьей строки пришла клавиша, а `move` — откуда
	 * шагать.
	 *
	 * Тип — элемент списка наследника (`TItem`), а база опирается только на
	 * `IControl`: навигации нужны `uid`, `disabled`, `rendered` и `visible`.
	 * Элементы ListBox и опции Select общего предка ниже `IControl` не имеют, и
	 * раньше здесь стоял `IListItem` от несуществующего теперь компонента
	 * `TList`. Массив — только для чтения: это сама выборка коллекции, у
	 * коллекции с памятью выборки — запомненная.
	 */
	protected shown(): readonly TItem[] {
		return batchOf<TItem>(this._engine)?.shown ?? []
	}

	/**
	 * Элементы, по которым идёт навигация: показанные и доступные. Недоступные
	 * пропускаются у ListBox и у Select одинаково — правило не зависит ни от
	 * роли элемента, ни от модели фокуса.
	 */
	protected items(): TItem[] {
		return this.shown().filter(isNavigable)
	}

	/* ---------------------------------------------------------------- */
	/* Общая механика                                                     */
	/* ---------------------------------------------------------------- */

	protected indexOf(uid: string | number | null): number {
		if (uid == null) return -1

		return this.items().findIndex((item) => item.uid === uid)
	}

	protected itemAt(index: number): TItem | null {
		return this.items()[index] ?? null
	}

	protected itemByUid(uid: string | number): TItem | null {
		return this.items().find((item) => item.uid === uid) ?? null
	}

	/**
	 * `id` подсвеченного элемента для ссылки `aria-activedescendant`, пока она
	 * повторяет экран: у элемента видна отметка и он в документе — его набор
	 * зарегистрирован. Иначе — `null`: позиция без отметки ссылкой не
	 * становится, а у элемента вне окна (`Virtual`) своего `id` нет, и
	 * оставшийся от прошлого монтирования указывал бы в пустоту.
	 *
	 * `id` — из набора `aria` элемента, а не с DOM-узла: узел, который знает
	 * реестр, — корень элемента, а `id` вместе со всей ARIA стоит на его строке.
	 * В набор его пишет `TOptionIdsPlugin` элемента, и ссылка берёт ровно то,
	 * что окажется в разметке. Куда её писать, решает наследник — туда, где
	 * фокус.
	 */
	protected highlightedId(): string | null {
		const uid = this._highlightedUid

		if (uid === null || !this._marked) return null
		if (this._bundles?.getByUid(uid) === undefined) return null

		return this.itemByUid(uid)?.aria.get('id') ?? null
	}

	/**
	 * Сдвигает подсветку к ближайшему доступному элементу в направлении шага.
	 * Навигация зациклена: с последнего элемента `↓` уводит на первый — так
	 * принято в списках и так делают Ark и Radix.
	 *
	 * Шаг отсчитывается от места подсветки среди показанных, а не среди
	 * доступных: подсвеченный элемент могли выключить, а ListBox ставит позицию
	 * и на выбранный элемент, который бывает выключен. Среди доступных такого
	 * нет, и стрелка увела бы на край списка. Так же ищут соседа
	 * `TTabsKeyboardPlugin` и `TTagsKeyboardPlugin`. Подсветки нет или её
	 * элемент не показан — шаг начинается с края.
	 */
	protected move(step: number): void {
		const shown = this.shown()
		const from = shown.findIndex((item) => item.uid === this._highlightedUid)

		if (from === -1) {
			this.highlightEdge(step > 0 ? 'first' : 'last')

			return
		}

		const count = shown.length

		for (let offset = 1; offset <= count; offset++) {
			const candidate = shown[(((from + step * offset) % count) + count) % count]

			if (isNavigable(candidate)) {
				this.highlight(candidate.uid)

				return
			}
		}
	}

	protected highlightEdge(edge: TListEdge): void {
		const items = this.items()

		if (items.length === 0) return

		this.highlight(items[edge === 'first' ? 0 : items.length - 1].uid)
	}

	/**
	 * Подсветить элемент: позиция плюс визуальная отметка — и сообщение о
	 * ней: `change:highlight` с элементом и соседями и хук наследника
	 * (`_announce`).
	 *
	 * Позиция может уже стоять на элементе без отметки — её ставит
	 * `trackHighlight` за выбором и со строки, с которой пришла клавиша. Тогда
	 * отметка встаёт на месте, и сообщение уходит так же: на экране подсветка
	 * появилась, хоть позиция и не сменилась. Так стрелка отмечает
	 * единственный доступный элемент — шаг по кругу приводит к нему же, — и
	 * список докручивает к нему. Подсвечивать нечего, только когда у элемента
	 * и позиция, и отметка: повтор молчит.
	 */
	protected highlight(uid: string | number): void {
		if (this._highlightedUid === uid && this._marked) return

		if (this._highlightedUid !== uid) this._moveTo(uid)

		const plugin = this.itemPlugin(uid)

		// Элемента ещё нет в документе (окно рисует его к следующему кадру) —
		// отметку он получит при регистрации своего набора
		if (plugin) plugin.highlighted = true

		this._marked = true

		this._announce(uid)
	}

	/**
	 * Запомнить позицию, не отмечая элемент визуально.
	 *
	 * Нужно при синхронизации с выбором: список открылся на выбранном
	 * элементе, но подсветка навигации ещё не должна быть видна. Отметка, которая
	 * была видна, снимается, и об этом уходит сообщение с `null`
	 * (`change:highlight` и `onHighlightChanged(null)`): позиция осталась, а
	 * подсветки на экране нет. Без отметки позиция переезжает молча — ни
	 * события, ни хука: на экране ничего не сменилось.
	 */
	protected trackHighlight(uid: string | number): void {
		if (this._highlightedUid === uid) return

		const marked = this._marked

		this._moveTo(uid)

		if (marked) this._announce(null)
	}

	/**
	 * Снять подсветку: позиции больше нет. Сообщение с `null` — только если
	 * отметка была видна: позиция без отметки уходит молча, как и переезжает.
	 */
	protected clearHighlight(): void {
		if (this._highlightedUid == null) return

		const marked = this._marked

		this.unmarkCurrent()

		this._highlightedUid = null
		this._pinHighlighted()

		if (marked) this._announce(null)
	}

	protected itemPlugin(uid: string | number): TListItemPlugin | undefined {
		return this._bundles?.getByUid(uid)?.get(TListItemPlugin)
	}

	/**
	 * Позиция — на элемент: прежняя отметка снята, элемент закреплён в окне.
	 * Событий здесь нет: ставить ли отметку и сообщать ли о ней, решает тот,
	 * кто позицию перенёс, — `highlight` или `trackHighlight`.
	 */
	private _moveTo(uid: string | number): void {
		this.unmarkCurrent()

		this._highlightedUid = uid
		this._pinHighlighted()
	}

	/**
	 * Видимая подсветка сменилась — одним сообщением обоим слушателям:
	 * `change:highlight` тем, кто слушает снаружи, и `onHighlightChanged`
	 * наследнику. Элемент — с соседями среди доступных; `null` — отметки
	 * больше нет, и соседей тоже.
	 */
	private _announce(uid: string | number | null): void {
		const items = this.items()
		const index = uid === null ? -1 : items.findIndex((item) => item.uid === uid)
		const item = items[index] ?? null

		this._sink.emit('change:highlight', {
			item,
			prevItem: item && (items[index - 1] ?? null),
			nextItem: item && (items[index + 1] ?? null),
		})
		this.onHighlightChanged(uid)
	}

	/** Снимает визуальную отметку с текущего элемента. */
	private unmarkCurrent(): void {
		this._marked = false

		if (this._highlightedUid == null) return

		const plugin = this.itemPlugin(this._highlightedUid)

		if (plugin) plugin.highlighted = false
	}

	/**
	 * Закрепить элемент позиции в окне коллекции, если оно есть: окно рисует
	 * его на месте, и подсветка, уведённая стрелкой за видимую полосу, не
	 * теряет узел. Позиции нет — закрепление снять.
	 */
	private _pinHighlighted(): void {
		const uid = this._highlightedUid
		const item =
			uid === null ? undefined : this.shown().find((candidate) => candidate.uid === uid)

		drawOf<TItem>(this._engine)?.pin(HIGHLIGHT, item)
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		this.onKeyDown(event)
	}
}
