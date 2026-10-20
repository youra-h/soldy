import { TBaseExtension, batchOf, factoryOf } from '../../../../../base/collection'
import type {
	IExtension,
	IExtensionContext,
	TCollectionEngineItemSource,
	TInsertEvent,
	TUpdateEvent,
} from '../../../../../base/collection'
import TMenuSubmenu, { isMenuSubmenu } from '../../../submenu/submenu.class'
import type { IMenuItem } from '../../../item/types'
import type { TMenuCollection } from '../../types'
import type {
	IMenuSubmenusExtension,
	IMenuSubmenusExtensionOptions,
	TMenuSubmenuEntries,
	TMenuSubmenuEntry,
	TMenuSubmenusExtensionEvents,
} from './types'

/** Вложенный состав данными — то, что уходит в движок подменю. */
type TNestedItems = TCollectionEngineItemSource<IMenuItem>[]

/** Вложенный состав данных — массив `items`; нет массива — `undefined`. */
function nestedOf(source: object): TNestedItems | undefined {
	return 'items' in source && Array.isArray(source.items) ? source.items : undefined
}

/** Те же ли записи: те же подменю с теми же движками. */
function sameEntries(a: TMenuSubmenuEntries, b: TMenuSubmenuEntries): boolean {
	if (a === b) return true
	if (a.size !== b.size) return false

	for (const [item, entry] of a) {
		if (b.get(item) !== entry) return false
	}

	return true
}

/**
 * TMenuSubmenusExtension — подменю из данных меню.
 *
 * Пункт данными с массивом `items` — подменю, а не действие: при вставке
 * сырой источник становится `TMenuSubmenu`, собранным из источника без
 * `items`, а его `items` — составом своего движка меню. Вложенного состава у
 * пункта нет: он живёт в движке, как у подменю разметкой, которому движок
 * дали снаружи (`engine`). Разметка раскладывает запись (`entries`) в пропсы
 * `Menu.Submenu` — `ctrl` и `engine`, — и дальше подменю из данных ничем не
 * отличается от подменю разметкой. Движок подменю — тоже движок меню, с этим
 * же расширением, поэтому уровней сколько угодно.
 *
 * Стоит до фабрики (`TFactoryExtension`): подписчики `item:add:before` идут
 * по порядку установки, и источник с `items` становится подменю раньше, чем
 * фабрика сделала бы из него действие, — экземпляр пункта она не трогает.
 * Сырой ли источник, решает она же (`isSource`): чей элемент, знает фабрика.
 * Своего догона у расширения нет: сырые источники, лежавшие в движке до
 * установки, перевставляет фабрика, и вставка проходит здесь.
 *
 * - **Движок — на `item:added`**, а не при подмене: вставку, отменённую
 *   подписчиком после нас, движок не переживает — его просто нет. Вложенный
 *   состав ждёт свою вставку: событие у пары одно.
 * - **Патч** (`batch.patch`, `plain.update`) пишет пункту его данные
 *   `Object.assign`, и `items` из `changes` уходит до записи: своего `items`
 *   у пункта нет. Вложенный состав идёт в состав движка подменю
 *   (`batch.items`) на `item:updated` того же события — отменённый патч его
 *   не трогает, — а у прочих пунктов отбрасывается: вид пункта решает
 *   вставка, и патч действие подменю не сделает.
 * - **Снятое подменю** уходит из записей на `item:removed`.
 * - **`trackBy`** вложенного движка — своего `batch`: новый движок получает
 *   его при сборке, все — на `change:trackBy`, а вложенный передаёт своим
 *   подменю тем же путём.
 * - **Владельца** во вложенный движок расширение не пишет: его привязывает
 *   фасад смонтированного подменю (`bindOwner` на `attach`), как у любого
 *   движка, пришедшего снаружи. Размер меню пункты подменю получают с ним.
 * - **Сборщик движка** передаёт тот, кто собирает детали меню
 *   (`menuExtensions`): импорт сборщика отсюда замкнул бы цикл модулей.
 *
 * Выход — `entries`, снимок: на каждую смену новый. `change:submenus` — раз на
 * запись, на `change:items`, и только если подменю пришло или ушло.
 */
export class TMenuSubmenusExtension
	extends TBaseExtension<IMenuItem, TMenuSubmenusExtensionEvents>
	implements IExtension<IMenuItem>, IMenuSubmenusExtension
{
	readonly name = 'submenus' as const

	private readonly _createEngine: () => TMenuCollection

	/** Записи подменю из данных — живые; наружу уходит снимок. */
	private readonly _entries = new Map<IMenuItem, TMenuSubmenuEntry>()

	/** Снимок записей; `null` — устарел, и `entries` соберёт новый. */
	private _snapshot: TMenuSubmenuEntries | null = null

	/** Снимок, о котором сообщил последний `change:submenus`. */
	private _announced: TMenuSubmenuEntries = new Map()

	/** Вложенный состав вставки — ждёт её `item:added`. Ключ — событие вставки. */
	private readonly _inserts = new WeakMap<TInsertEvent<IMenuItem>, TNestedItems>()

	/** Вложенный состав патча — ждёт его `item:updated`. Ключ — событие патча. */
	private readonly _updates = new WeakMap<TUpdateEvent<IMenuItem>, TNestedItems>()

	constructor(options: IMenuSubmenusExtensionOptions) {
		super()

		this._createEngine = options.createEngine
	}

	/** Подменю из данных по пункту — снимок, на каждую смену новый. */
	get entries(): TMenuSubmenuEntries {
		this._snapshot ??= new Map(this._entries)

		return this._snapshot
	}

	override install(ctx: IExtensionContext<IMenuItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:add:before', (e) => this._convert(e))
		ctx.driver.events.on('item:added', (e) => this._open(e))
		ctx.driver.events.on('item:update:before', (e) => this._detach(e))
		ctx.driver.events.on('item:updated', (e) => this._patch(e))
		ctx.driver.events.on('item:removed', (e) => this._drop(e.item))

		// Раз на запись: `change:items` приходит следом за всеми `item:*`
		// команды и пачки
		ctx.driver.events.on('change:items', () => this._announce())

		batchOf(ctx)?.events.on('change:trackBy', (trackBy) => {
			for (const { engine } of this._entries.values()) {
				engine.extensions.batch.trackBy = trackBy
			}
		})
	}

	/** Сырой источник с массивом `items` — подменю из источника без `items`. */
	private _convert(e: TInsertEvent<IMenuItem>): void {
		const source = e.item

		if (!factoryOf(this._ctx)?.isSource(source)) return

		const nested = nestedOf(source)

		if (!nested) return

		const props = { ...source }

		Reflect.deleteProperty(props, 'items')

		e.item = new TMenuSubmenu(props)
		this._inserts.set(e, nested)
	}

	/** Подменю вставлено — завести ему движок с вложенным составом. */
	private _open(e: TInsertEvent<IMenuItem>): void {
		const nested = this._inserts.get(e)
		const ctrl = e.item

		if (!nested || !isMenuSubmenu(ctrl)) return

		this._inserts.delete(e)

		const engine = this._createEngine()
		const { batch } = engine.extensions

		batch.trackBy = batchOf(this._ctx)?.trackBy
		batch.set(nested)

		this._entries.set(ctrl, { ctrl, engine })
		this._snapshot = null
	}

	/**
	 * Патч пункта: `items` — не его пропс, и до `Object.assign` из `changes` он
	 * уходит. Вложенный состав ждёт `item:updated` того же патча.
	 */
	private _detach(e: TUpdateEvent<IMenuItem>): void {
		const { changes } = e

		if (!('items' in changes)) return

		const nested = nestedOf(changes)

		Reflect.deleteProperty(changes, 'items')

		if (nested) this._updates.set(e, nested)
	}

	/** Патч состоялся — вложенный состав подменю в состав его движка. */
	private _patch(e: TUpdateEvent<IMenuItem>): void {
		const nested = this._updates.get(e)

		if (!nested) return

		this._updates.delete(e)

		// У действия записи нет: вид пункта решила вставка
		const entry = this._entries.get(e.item)

		if (entry) entry.engine.extensions.batch.items = nested
	}

	/** Подменю ушло из коллекции — его записи больше нет. */
	private _drop(item: IMenuItem): void {
		if (this._entries.delete(item)) this._snapshot = null
	}

	/** Конец записи: подменю пришло или ушло — один `change:submenus`. */
	private _announce(): void {
		const entries = this.entries

		if (sameEntries(entries, this._announced)) return

		this._announced = entries
		this.events.emit('change:submenus', entries)
	}
}
