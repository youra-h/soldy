import { LIST_DEFAULTS, drawOf, selectionOf } from '@soldy-ui/core'
import type { IControl, IDrawExtension, TCollectionEngine, TScrollBehavior } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { smoothScrollBehavior } from '../../../motion'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import type { THighlightPayload } from '../navigation'
import { newlySelected } from '../newly-selected'
import { scrollContainerOf } from '../row'
import type { IListScrollPluginOptions, TListScrollPluginEvents } from './types'

/** Причина закрепления цели в окне коллекции — к ней крутит прокрутка. */
const SCROLL = 'scroll'

/**
 * Допуск на субпиксельное округление: край, вышедший из окна списка на
 * полпикселя, — ещё в окне. Список встаёт на целый пиксель, а края элементов
 * дробные.
 */
const TOLERANCE = 0.5

/**
 * Что плагину нужно от владельца: как прокручивать. Структурный тип, а не
 * `IList`: плагин стоит и на меню, у которого этого свойства нет, — тогда
 * действует умолчание списков (`LIST_DEFAULTS`).
 */
interface IListScrollOwner {
	readonly scrollBehavior?: TScrollBehavior
}

/**
 * Факт, за которым список докручивает к элементу: элементу задали значение
 * (`value`) или на нём встала видимая подсветка (`highlight`). Кто это сделал
 * — клик, клавиша, код приложения, монтирование, — неважно: от факта зависит
 * только правило прокрутки.
 */
type TScrollFact = 'value' | 'highlight'

/** Куда прокрутить: элемент и факт. `instant` — монтирование: сразу и при `smooth`. */
type TScrollTarget = {
	readonly item: IControl
	readonly fact: TScrollFact
	readonly instant: boolean
}

/**
 * Значение двигает только прокрутку самого списка, страница стоит. Элемент
 * виден целиком — ничего; частью — до ближайшего края окна списка: срезанная
 * строка после клика встаёт целиком и остаётся под курсором; не виден вовсе —
 * в середину окна: дальний выбранный (монтирование, список лет) виден вместе с
 * соседями. Окно — паддинг-бокс прокрутки. Своей прокрутки у списка нет
 * (`scrollContainerOf`) — ничего: элементы помещаются или список скрыт.
 */
function revealValue(node: Element, behavior: ScrollBehavior): void {
	const container = scrollContainerOf(node)

	if (!container) return

	const top = container.getBoundingClientRect().top + container.clientTop
	const bottom = top + container.clientHeight
	const rect = node.getBoundingClientRect()

	if (rect.top >= top - TOLERANCE && rect.bottom <= bottom + TOLERANCE) return

	let shift = rect.top + rect.height / 2 - (top + bottom) / 2

	// Виден частью — ближайшим краем
	if (rect.bottom > top && rect.top < bottom) {
		shift = rect.top < top ? rect.top - top : rect.bottom - bottom
	}

	container.scrollTo({ top: container.scrollTop + shift, behavior })
}

/**
 * TListScrollPlugin — прокрутка списка к элементу: ListBox, Select, меню и
 * подменю (и всего, что построено на них, — панели выбора месяца и года
 * Calendar это ListBox).
 *
 * **Список докручивает к элементу ровно за двумя фактами** — элементу задали
 * значение и на элементе встала видимая подсветка. Источник механизму
 * безразличен: клик по строке, Enter и пробел, значение снаружи и
 * монтирование — значение; стрелки, Home и End, буквы, наведение в меню и
 * открытие с клавиатуры — подсветка. Флагов «откуда пришло» нет.
 *
 * - **Значение** — `change:selection` расширения выбора: к элементу, который
 *   стал выбранным (`newlySelected`), тем же правилом, что позиция клавиатуры
 *   ListBox. Не к первому выбранному: в `multiple` выбор видимого элемента
 *   уводил бы список к первому выбранному. Снятие выбора не крутит, а цель,
 *   с которой значение сняли до кадра, отменяет. У меню выбор — отметка
 *   флажков и переключателей. Двигается только сам список (`revealValue`):
 *   страница от смены значения не прыгает.
 * - **Подсветка** — `change:highlight` навигации списка, класс которой задаёт
 *   опция `navigation` (`IListScrollPluginOptions`): событие сообщает о видимой
 *   отметке, и позиция без неё — за выбором, на строке, с которой ушёл Tab, —
 *   список не двигает. Подсвеченный элемент встаёт ближайшим краем
 *   (`scrollIntoView` с `block: 'nearest'`), как от фокуса: при нужде и
 *   страница. Подсветку сняли — её ждущая цель отменена, цель значения нет.
 *
 * Центр всегда не годится — клик тоже значение, и срезанная строка уехала бы
 * из-под курсора; край всегда — тоже: дальний выбранный терял бы контекст.
 *
 * **Цель одна — последняя**, и прокрутка к ней — в следующем кадре: узел
 * элемента, который окно дорисовывает, и панель, открытую той же клавишей,
 * адаптер рисует после обработчика. Кадр свой и отменяемый: новая цель, снятая
 * подсветка, снятие корня и уничтожение плагина отменяют его. Кадр
 * планируется, только пока у плагина есть узел корня (`ready` … `removed`):
 * сборка вместе с подписками идёт и на сервере, где нет ни узла, ни
 * `requestAnimationFrame`.
 *
 * **Начальная прокрутка** — список открывается на первом выбранном. Ей нужны
 * и узел корня, и движок, а приходят они порознь: движок привязывают при
 * сборке, узел корня плагин получает кадром после монтирования (`ready`).
 * Поэтому её зовут оба события, а срабатывает то, что пришло вторым, — в
 * жизни это `ready`. Попытка — сразу, без кадра: к `ready` узлы элементов уже
 * привязаны, а предел строк поставлен (`TListHeightPlugin` ставит его на том
 * же `ready` и стоит в наборе раньше). Она мгновенная и при `smooth`:
 * анимировать не от чего, а плавный проход перерисовывал бы окно на каждом
 * кадре. Скрытый список — закрытая панель Select и меню — не крутится: своей
 * прокрутки у него нет.
 *
 * **Цели нет в документе** — окно (обёртка `Virtual`) её не нарисовало. Тогда
 * плагин закрепляет её своей причиной в рисовании коллекции (`draw.pin`), и
 * окно дорисовывает её после замера, а прокрутка ждёт, когда набор цели
 * зарегистрируют, и идёт кадром позже: узел адаптер привязывает после
 * регистрации. Закрепление снимает следующая цель или отмена, а не сама
 * прокрутка: окно перемеряется кадром позже, и без закрепления оно на этот
 * кадр убрало бы цель, к которой только что прокрутили, — список мигнул бы
 * распорками. Скрытый список окно не мерит, и цель в нём ждёт, пока список не
 * покажут.
 *
 * Как прокручивать, решает `scrollBehavior` владельца (`IList`): свойством
 * владеет ядро, плагин его только читает, в момент прокрутки. У меню свойства
 * нет — умолчание списков. `none` — прокрутки нет, `instant` — сразу,
 * `smooth` — плавно, только пока режим движения библиотеки движение не убрал
 * (`smoothScrollBehavior`).
 */
export class TListScrollPlugin extends TBasePlugin<any, TListScrollPluginEvents> {
	/** Узел корня: без него крутить нечего — на сервере, до `ready`, после `removed`. */
	private _root: Element | null = null
	private _owner: IListScrollOwner | null = null
	private _bundles: TCollectionBundlesPlugin | null = null
	private _elements: TCollectionElements | null = null
	/** Куда прокрутить — одна цель, последняя; `null` — некуда. */
	private _target: TScrollTarget | null = null
	/** Кадр с прокруткой к цели; `null` — кадр не запланирован. */
	private _frame: number | null = null

	override install(ctx: IPluginContext, options?: IListScrollPluginOptions): void {
		super.install(ctx, options)

		this._owner = ctx.getInstance<IListScrollOwner>()
		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element
			this._revealSelected()
		})

		elementPlugin?.events.on('removed', () => {
			this._root = null
			this._drop()
		})

		this._bundles?.events.on('engine:bound', (engine) => {
			this._subscribeToEngine(engine)
			this._revealSelected()
		})

		// Цель вошла в документ — окно нарисовало её, закреплённую. Узел адаптер
		// привязывает после регистрации: прокрутка — кадром позже
		this._bundles?.events.on('bundle:registered', ({ uid }) => {
			if (uid === this._target?.item.uid) this._schedule()
		})

		const navigation = options?.navigation ? ctx.get(options.navigation) : undefined

		navigation?.events.on('change:highlight', ({ item }: THighlightPayload) => {
			if (item) this._follow(item, 'highlight')
			else if (this._target?.fact === 'highlight') this._drop()
		})
	}

	override destroy(): void {
		// Закрепление снимается, пока движок известен: движок снаружи переживает
		// плагин
		this._drop()

		this._root = null
		this._owner = null
		this._bundles = null
		this._elements = null

		super.destroy()
	}

	/**
	 * Значение — к элементу, который стал выбранным (`newlySelected`). Значение
	 * сняли с цели, к которой ещё не прокрутили, — цель отменена: крутить к
	 * невыбранному незачем.
	 */
	private _subscribeToEngine(engine: TCollectionEngine<any, any>): void {
		this._listenTo(
			selectionOf<IControl>(engine)?.events,
			'change:selection',
			(items, changed) => {
				const item = newlySelected(items, changed)
				const target = this._target

				if (item) this._follow(item, 'value')
				else if (target?.fact === 'value' && !items.includes(target.item)) this._drop()
			},
		)
	}

	/**
	 * Начальная прокрутка к первому выбранному — когда есть и узел корня, и
	 * движок. Попытка сразу и мгновенно; выбранного нет — прежняя цель
	 * отменена: она от прежнего движка.
	 */
	private _revealSelected(): void {
		const engine = this._bundles?.engine

		if (!this._root || !engine) return

		const [selected] = selectionOf<IControl>(engine)?.selected ?? []

		if (!selected) {
			this._drop()

			return
		}

		this._aim({ item: selected, fact: 'value', instant: true })
		this._attempt()
	}

	/** Случился факт: цель — его элемент, прокрутка — в следующем кадре. */
	private _follow(item: IControl, fact: TScrollFact): void {
		// Без узла корня крутить нечего: к выбранному доведёт начальная прокрутка
		if (!this._root) return

		this._aim({ item, fact, instant: false })
		this._schedule()
	}

	/** Новая цель вместо прежней: кадр и закрепление прежней сняты. */
	private _aim(target: TScrollTarget): void {
		this._drop()
		this._target = target
	}

	/** Цели больше нет: кадр отменён, закрепление снято. */
	private _drop(): void {
		this._cancel()
		this._target = null
		this._draw()?.pin(SCROLL, undefined)
	}

	/** Прокрутка к цели — в следующем кадре, только при узле корня. */
	private _schedule(): void {
		this._cancel()

		if (!this._root) return

		this._frame = requestAnimationFrame(() => {
			this._frame = null
			this._attempt()
		})
	}

	private _cancel(): void {
		if (this._frame === null) return

		cancelAnimationFrame(this._frame)
		this._frame = null
	}

	/**
	 * Прокрутить к цели — по правилу её факта. Узла у неё нет — окно её не
	 * нарисовало: закрепить и ждать, когда зарегистрируют её набор.
	 * Прокрутили — цель исполнена, а закрепление остаётся до следующей цели
	 * (см. описание класса).
	 *
	 * `scrollIntoView` вызывается, если он есть: в jsdom его нет. Прокрутка —
	 * удобство, а не часть контракта.
	 */
	private _attempt(): void {
		const target = this._target

		if (!target || !this._root) return

		const behavior = this._owner?.scrollBehavior ?? LIST_DEFAULTS.scrollBehavior

		if (behavior === 'none') {
			this._drop()

			return
		}

		const node = this._elements?.getElementByUid(target.item.uid) ?? null

		if (!node) {
			this._draw()?.pin(SCROLL, target.item)

			return
		}

		this._target = null

		const scroll =
			target.instant || behavior === 'instant' ? 'instant' : smoothScrollBehavior(node)

		if (target.fact === 'highlight') {
			node.scrollIntoView?.({ block: 'nearest', behavior: scroll })
		} else {
			revealValue(node, scroll)
		}
	}

	/** Рисование коллекции — у списков в окне; у меню его нет, и закреплять нечего. */
	private _draw(): IDrawExtension<IControl> | undefined {
		return drawOf<IControl>(this._bundles?.engine)
	}
}
