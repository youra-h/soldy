import type { IExtension, IExtensionContext, IBaseOwnerItemExtensionOptions } from '../types'
import type { TUniqueEvents, IUniqueExtension } from './types'
import type { IUniqueItemExtension } from './item'
import { TUniqueItemExtension } from './item'
import { TBaseOwnerItemExtension } from '../base-owner-item-extension.class'

/** `uid` элемента: числовой у сущностей (`IEntity`), у простых объектов его нет. */
function uidOf(item: object): number | undefined {
	return 'uid' in item && typeof item.uid === 'number' ? item.uid : undefined
}

/**
 * TUniqueExtension — расширение уникальности элементов коллекции.
 *
 * Гарантирует, что элемент с тем же `uid` не будет добавлен в коллекцию дважды.
 * Элементы без числового `uid` (простые объекты) не отслеживаются.
 * Реестр известных `uid` хранится в `Set` — проверка за O(1), без линейного поиска
 * по массиву на каждой вставке.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TUniqueExtension<TItem extends object = any>
	extends TBaseOwnerItemExtension<TItem, IUniqueItemExtension<TItem>, TUniqueEvents>
	implements IExtension<TItem>, IUniqueExtension<TItem>
{
	readonly name = 'unique' as const

	private readonly _known = new Set<number>()

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IUniqueItemExtension<TItem>>) {
		super(TUniqueItemExtension, options)
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => {
			const uid = uidOf(e.item)

			if (uid !== undefined) {
				this._known.add(uid)
			}
		})

		ctx.driver.events.on('item:removed', (e) => {
			const uid = uidOf(e.item)

			if (uid !== undefined) {
				this._known.delete(uid)
			}
		})

		ctx.driver.events.on('reset', () => {
			this._known.clear()
		})

		// Отменяем вставку, если элемент уже зарегистрирован.
		ctx.driver.events.on('item:add:before', (e) => {
			const uid = uidOf(e.item)

			if (uid !== undefined && this._known.has(uid)) {
				e.preventDefault()
			}
		})
	}

	has(item: TItem): boolean {
		const uid = uidOf(item)

		return uid !== undefined && this._known.has(uid)
	}
}
