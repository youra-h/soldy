import { TBaseExtension } from '../base-extension.class'
import type { IExtension, IExtensionContext } from '../types'
import type { TFilterEvents, TFilterPredicate, IFilterExtension } from './types'

/**
 * TFilterExtension — сужение состава, а не операция над storage.
 *
 * Единственный работающий слой у driver — цепочка проекторов (`driver.projectors`,
 * см. `engine/types.ts`). Расширение лишь регистрирует в ней один проектор и
 * держит его состояние (предикат, текст запроса) снаружи: сам проектор — чистая
 * функция без памяти, драйвер её не хранит и не обязан ничего о ней знать.
 *
 * Предикат общий по форме — `(item, query) => boolean` — и не завязан ни на
 * `text`, ни на `value`: какое поле сравнивать, знает только владелец
 * коллекции (Select ставит сравнение по тексту, у таблицы это могло быть
 * любое из её полей). Без предиката проектор — тождество: состав не сужается.
 *
 * `storage` фильтр не трогает вовсе: сужается только `driver.projection`,
 * `batch.patch`/`value`/`tags` по-прежнему видят полный сырой состав через
 * `driver`/`valueOf()`/`forEach` и так далее.
 */
export class TFilterExtension<TItem extends object = any>
	extends TBaseExtension<TItem, TFilterEvents>
	implements IExtension<TItem, TFilterEvents>, IFilterExtension<TItem>
{
	readonly name = 'filter' as const

	private _predicate?: TFilterPredicate<TItem>
	private _query = ''

	get predicate(): TFilterPredicate<TItem> | undefined {
		return this._predicate
	}

	set predicate(fn: TFilterPredicate<TItem> | undefined) {
		if (this._predicate === fn) return

		this._predicate = fn

		this.events.emit('change:predicate')
		this._ctx?.driver.projectors.invalidate()
	}

	get query(): string {
		return this._query
	}

	set query(value: string) {
		if (this._query === value) return

		this._query = value

		this.events.emit('change:query', value)
		this._ctx?.driver.projectors.invalidate()
	}

	get active(): boolean {
		return !!this._predicate
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.projectors.use((items) => {
			const predicate = this._predicate

			if (!predicate) return items

			const query = this._query

			return items.filter((item) => predicate(item, query))
		})
	}
}
