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
 *
 * Реестр `uid` в `Set` — быстрый путь: промах значит «в хранилище такого `uid`
 * нет», и вставка нового элемента проверяется за O(1). Попадание перепроверяется
 * линейным поиском по хранилищу: внутри батча драйвер откладывает `item:added` и
 * `item:removed` до конца, и реестр может ещё помнить удалённый `uid`.
 *
 * По той же причине `uid` заносится в реестр уже в `item:add:before`, не дожидаясь
 * `item:added`: иначе второй элемент с тем же `uid` в одном батче прошёл бы мимо.
 * Реестр поэтому может быть шире хранилища (вставку отменил подписчик после нас) —
 * это стоит лишней перепроверки, но не ошибки.
 *
 * Не ловится один случай: `uid` подменяет подписчик после нас — `factory`
 * превращает сырой источник в сущность. Её `uid` попадает в реестр только с
 * `item:added`, поэтому повторная вставка той же сущности в том же батче пройдёт.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TUniqueExtension<TItem extends object = any>
	extends TBaseOwnerItemExtension<TItem, IUniqueItemExtension<TItem>, TUniqueEvents>
	implements IExtension<TItem>, IUniqueExtension<TItem>
{
	readonly name = 'unique' as const

	/** `uid`, которые могут лежать в хранилище. Всё, что там лежит, здесь есть. */
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

		// Отменяем вставку, если элемент с тем же `uid` уже лежит в хранилище.
		ctx.driver.events.on('item:add:before', (e) => {
			const uid = uidOf(e.item)

			if (uid === undefined) return

			if (this._stored(uid)) {
				e.preventDefault()

				return
			}

			this._known.add(uid)
		})
	}

	has(item: TItem): boolean {
		const uid = uidOf(item)

		return uid !== undefined && this._stored(uid)
	}

	/** Лежит ли в хранилище элемент с этим `uid`. Промах реестра — точно нет, попадание сверяется с хранилищем. */
	private _stored(uid: number): boolean {
		return (
			this._known.has(uid) && this._ctx.driver.valueOf().some((item) => uidOf(item) === uid)
		)
	}
}
