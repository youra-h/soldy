import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import type { IMemoryExtension, TMemoryEvents } from './types'

/**
 * TMemoryExtension — память выборки для коллекций с большими данными.
 *
 * Без неё каждое чтение `batch.shown` исполняет читающую команду, и
 * подписчики `items:query:before` заново отбирают и упорядочивают весь состав.
 * На таблице в тысячи строк это сортировка на каждое чтение, а показ читает
 * строки не один раз за проход.
 *
 * Память — стратегия чтения драйвера (`useQueryStrategy`), а не свой геттер
 * рядом: читают все по-прежнему `batch.shown`, и путь чтения один. Выборка
 * исполняется при первом чтении и до сброса отдаётся тем же массивом.
 * Сбрасывает её драйвер — в момент записи, изменившей хранилище, и на
 * `invalidateQuery()`. Своих поводов у памяти нет, поэтому и под неё ни
 * фильтр, ни сортировка флагов не держат.
 *
 * Отсюда правило для всех, кто подписан на `items:query:before`: сменились
 * условия выборки — зови `invalidateQuery()`, иначе с памятью смену не видно.
 * Предел тот же, что у отбора и сортировки без памяти: о правке элемента на
 * месте, мимо команд (`row.data = …`), не узнаёт никто, и выборка её не видит
 * до следующей записи или `invalidateQuery()`.
 *
 * Подключается явно, к коллекции, у которой большие данные, — последней:
 * расширения, которые подписываются на выборку, ставятся раньше.
 */
export class TMemoryExtension<TItem extends object>
	extends TBaseExtension<TItem, TMemoryEvents>
	implements IExtension<TItem>, IMemoryExtension<TItem>
{
	readonly name = 'memory' as const

	/** Выборка с последнего сброса; нет — исполнится при следующем чтении. */
	private _remembered: readonly TItem[] | undefined = undefined

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.useQueryStrategy(this)
	}

	read(run: () => readonly TItem[]): readonly TItem[] {
		this._remembered ??= run()

		return this._remembered
	}

	stale(): void {
		this._remembered = undefined
	}
}
