import type { IExtension, IExtensionContext } from '../types'
import type { TFilterEvents, IFilterExtension, TFilterPredicate } from './types'
import { TBaseExtension } from '../base-extension.class'

/**
 * TFilterExtension — отбор элементов на выдаче.
 *
 * Подключается к `items:query:before` и сужает список до того, как он уйдёт
 * читателю. Хранилище при этом не трогается вовсе: запись идёт командами прямо
 * в storage и выборки не видит, поэтому включённый фильтр не мешает ни
 * `patch`, ни выбору, ни связи «значение ↔ элемент».
 *
 * Про поля расширение ничего не знает: по умолчанию сравнивает подстроку со
 * всем, что удалось прочитать у элемента. Компонент, который знает свою
 * предметную область, сужает это сам — `Select` ставит `fields = ['text']`,
 * таблица перечислит свои колонки, а кому нужно правило сложнее подстроки,
 * задаёт `predicate`.
 *
 * @example
 * ```ts
 * const filter = new TFilterExtension<IRow>()
 *
 * filter.query = 'иван'                       // по всем полям
 * filter.fields = ['firstName', 'lastName']   // только по этим
 * filter.predicate = (row) => row.age > 18    // своё правило
 * ```
 */
export class TFilterExtension<TItem extends object = any>
	extends TBaseExtension<TItem, TFilterEvents<TItem>>
	implements IExtension<TItem>, IFilterExtension<TItem>
{
	readonly name = 'filter' as const

	private _query = ''
	private _fields?: (keyof TItem)[]
	private _predicate?: TFilterPredicate<TItem>

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('items:query:before', (e) => {
			if (!this.active) return

			e.items = e.items.filter((item) => this.matches(item))
		})
	}

	get query(): string {
		return this._query
	}

	set query(value: string) {
		if (this._query === value) return

		this._query = value

		this.events.emit('change:query', value)
		this.events.emit('change:filter')

		this._ctx.driver.invalidateQuery()
	}

	get fields(): (keyof TItem)[] | undefined {
		return this._fields
	}

	set fields(value: (keyof TItem)[] | undefined) {
		if (this._fields === value) return

		this._fields = value

		this.events.emit('change:fields', value)
		this.events.emit('change:filter')

		this._ctx.driver.invalidateQuery()
	}

	get predicate(): TFilterPredicate<TItem> | undefined {
		return this._predicate
	}

	set predicate(value: TFilterPredicate<TItem> | undefined) {
		if (this._predicate === value) return

		this._predicate = value

		this.events.emit('change:predicate', value)
		this.events.emit('change:filter')

		this._ctx.driver.invalidateQuery()
	}

	/**
	 * Свой предикат делает фильтр активным всегда — он может отбирать и без
	 * запроса («только доступные», «дороже тысячи»). Поиск по полям без запроса
	 * не значит ничего, поэтому пустая строка выключает отбор.
	 */
	get active(): boolean {
		return Boolean(this._predicate) || this._query.trim().length > 0
	}

	matches(item: TItem): boolean {
		if (this._predicate) return this._predicate(item, this._query)

		const query = this._query.trim().toLowerCase()

		if (!query) return true

		const fields = this._fields ?? (readableKeys(item) as (keyof TItem)[])

		return fields.some((field) => {
			const value = item[field]

			if (typeof value === 'string') return value.toLowerCase().includes(query)
			if (typeof value === 'number' || typeof value === 'boolean') {
				return String(value).toLowerCase().includes(query)
			}

			// Объекты, массивы, функции и пустые значения в поиск по подстроке не
			// годятся: сравнивать «[object Object]» бессмысленно.
			return false
		})
	}

	clear(): void {
		this.query = ''
	}
}

/**
 * Имена полей, которые можно прочитать у элемента.
 *
 * Собственных ключей мало: элемент коллекции — обычно инстанс класса, и `text`
 * у него аксессор в прототипе, а `Object.keys` таких не показывает. Поэтому к
 * собственным ключам добавляются геттеры всей цепочки прототипов — до
 * `Object.prototype`, дальше идёт уже не предметная область.
 *
 * Это «по умолчанию», а не гарантия: элемент с вычисляемым свойством вне
 * прототипа сюда не попадёт. Кому нужна точность — задаёт `fields`.
 */
function readableKeys(item: object): string[] {
	const keys = new Set<string>(Object.keys(item))

	let proto = Object.getPrototypeOf(item)

	while (proto && proto !== Object.prototype) {
		for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(proto))) {
			if (key === 'constructor') continue
			if (typeof descriptor.get === 'function') keys.add(key)
		}

		proto = Object.getPrototypeOf(proto)
	}

	return [...keys]
}
