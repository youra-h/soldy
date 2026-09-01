import type { IExtension, IExtensionContext, IBaseOwnerItemExtensionOptions } from '../types'
import type { TUniqueEvents, IUniqueExtension } from './types'
import type { IUniqueItemExtension } from './item'
import { TUniqueItemExtension } from './item'
import { TBaseOwnerItemExtension } from '../base-owner-item-extension.class'

/**
 * TUniqueExtension — расширение уникальности элементов коллекции.
 *
 * Гарантирует, что один и тот же объект (по ссылке) не будет добавлен в коллекцию дважды.
 * Реестр известных элементов хранится в `Set` — проверка за O(1), без линейного поиска
 * по массиву на каждой вставке.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TUniqueExtension<TItem extends object = any>
	extends TBaseOwnerItemExtension<TItem, IUniqueItemExtension<TItem>, TUniqueEvents>
	implements IExtension<TItem>, IUniqueExtension<TItem>
{
	readonly name = 'unique' as const

	private readonly _known = new Set<Number>()

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IUniqueItemExtension<TItem>>) {
		super(TUniqueItemExtension, options)
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => {
			const { item } = e

			if ('uid' in item) {
				this._known.add((item as any).uid)
			}
		})

		ctx.driver.events.on('item:removed', (item) => {
			if ('uid' in item) {
				this._known.delete((item as any).uid)
			}
		})

		ctx.driver.events.on('reset', () => {
			this._known.clear()
		})

		// Отменяем вставку, если элемент уже зарегистрирован.
		ctx.driver.events.on('item:add:before', (e) => {
			if (this._known.has((e.item as any).uid)) {
				e.preventDefault()
			}
		})
	}

	has(item: TItem): boolean {
		return this._known.has((item as any).uid)
	}
}
