import type { IControl, IBatchExtension, TCollectionEngine, TEventSink } from '@soldy/core'
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

/**
 * TListNavigationPlugin — общая механика навигации по коллекции с клавиатуры.
 *
 * Здесь всё, что не зависит от роли элемента и модели фокуса: подписка на
 * `keydown`, привязка к движку коллекции, учёт подсвеченного элемента,
 * циклический сдвиг и пропуск недоступных элементов. Что делают конкретные
 * клавиши и что означает активация — дело наследника.
 *
 * Граница проведена именно так не из аккуратности. `ListBox` — самостоятельный
 * фокусируемый виджет с roving tabindex, `Select` — combobox, у которого фокус
 * не уходит с поля, а подсветка передаётся через `aria-activedescendant`. Роли
 * (`option` против `option` в другом контейнере), набор клавиш и смысл
 * активации у них разные, и попытка выразить это режимами одного плагина
 * заставила бы его тесты охранять два поведения сразу.
 *
 * Подсветка — не выбор. Она визуальна, живёт только во время навигации и в
 * значение не попадает; хранится в `TListItemPlugin` каждого элемента.
 */
export abstract class TListNavigationPlugin<
	TEvents extends TListNavigationPluginEvents = TListNavigationPluginEvents,
> extends TBasePlugin<any, TEvents> {
	/** Узел нужен только под слушатель клавиш — отсюда и тип. */
	protected _element: IDomEventTarget | null = null
	protected _bundles: TCollectionBundlesPlugin | null = null
	protected _engine: TCollectionEngine<any, any> | null = null
	protected _highlightedUid: string | number | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null

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
	 * конкретной карте (см. `TEventSink` в `@soldy/core`).
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

	/** Подсветка переехала. Здесь наследник обновляет ARIA, скроллит и т.п. */
	protected onHighlightChanged(_uid: string | number | null): void {}

	/**
	 * Показанные элементы — `batch.shown`, а не `batch.items`: ходить
	 * стрелками по тому, что отбор скрыл, нельзя. Среди них и недоступные: по
	 * ним наследник узнаёт, с чьей строки пришла клавиша, а `move` — откуда
	 * шагать.
	 *
	 * Тип — `IControl`, а не элемент конкретного списка: навигации нужны только
	 * `uid`, `disabled`, `rendered` и `visible`. Элементы ListBox и опции Select
	 * общего предка ниже `IControl` не имеют, и раньше здесь стоял `IListItem`
	 * от несуществующего теперь компонента `TList`.
	 */
	protected shown(): IControl[] {
		const batch = this._engine?.extensions.batch as IBatchExtension<IControl> | undefined

		return (batch?.shown ?? []) as IControl[]
	}

	/**
	 * Элементы, по которым идёт навигация: показанные и доступные. Недоступные
	 * пропускаются у ListBox и у Select одинаково — правило не зависит ни от
	 * роли элемента, ни от модели фокуса.
	 */
	protected items(): IControl[] {
		return this.shown().filter(isNavigable)
	}

	/* ---------------------------------------------------------------- */
	/* Общая механика                                                     */
	/* ---------------------------------------------------------------- */

	protected indexOf(uid: string | number | null): number {
		if (uid == null) return -1

		return this.items().findIndex((item) => item.uid === uid)
	}

	protected itemAt(index: number): IControl | null {
		return this.items()[index] ?? null
	}

	protected itemByUid(uid: string | number): IControl | null {
		return this.items().find((item) => item.uid === uid) ?? null
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

	/** Перенести подсветку: позиция плюс визуальная отметка элемента. */
	protected highlight(uid: string | number): void {
		if (this._highlightedUid === uid) return

		this.trackHighlight(uid)

		const plugin = this.itemPlugin(uid)

		if (plugin) plugin.highlighted = true

		this.onHighlightChanged(uid)
	}

	/**
	 * Запомнить позицию, не отмечая элемент визуально.
	 *
	 * Нужно при синхронизации с выбором: список открылся на выбранном
	 * элементе, но подсветка навигации ещё не должна быть видна.
	 */
	protected trackHighlight(uid: string | number): void {
		if (this._highlightedUid === uid) return

		this.unmarkCurrent()

		this._highlightedUid = uid

		const index = this.indexOf(uid)

		this.emitHighlight(this.itemAt(index), this.itemAt(index - 1), this.itemAt(index + 1))
	}

	protected clearHighlight(): void {
		if (this._highlightedUid == null) return

		this.unmarkCurrent()

		this._highlightedUid = null

		this.emitHighlight(null, null, null)
		this.onHighlightChanged(null)
	}

	protected itemPlugin(uid: string | number): TListItemPlugin | undefined {
		return this._bundles?.getByUid(uid)?.get(TListItemPlugin)
	}

	/** Снимает визуальную отметку с текущего элемента. */
	private unmarkCurrent(): void {
		if (this._highlightedUid == null) return

		const plugin = this.itemPlugin(this._highlightedUid)

		if (plugin) plugin.highlighted = false
	}

	private emitHighlight(
		item: IControl | null,
		prevItem: IControl | null,
		nextItem: IControl | null,
	): void {
		this._sink.emit('change:highlight', { item, prevItem, nextItem })
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		this.onKeyDown(event)
	}
}
