import type { IQueryCommand, ICommandContext } from './types'
import { TQueryEvent } from '../types'

/**
 * Команда чтения состава коллекции.
 *
 * Берёт снимок сырого storage, отдаёт его подписчикам `items:query:before` и
 * возвращает то, что получилось. Расширение (фильтр, сортировка, обёртка над
 * элементом) вклинивается именно здесь — так же, как `TFactoryExtension`
 * вклинивается в `item:add:before` у `TInsertCommand`.
 *
 * Снимок, а не живая ссылка на `storage.items`: подписчик получает массив,
 * который не менялся бы под ним при мутации хранилища.
 */
export class TQueryCommand<TItem> implements IQueryCommand<TItem> {
	private _event?: TQueryEvent<TItem>

	apply(ctx: ICommandContext<TItem>): void {
		this._event = new TQueryEvent<TItem>([...ctx.storage.items])

		ctx.events.emit('items:query:before', this._event)
	}

	/**
	 * `preventDefault()` на событии означает «выборку не отдавать»: подписчик
	 * берёт ответственность на себя и результат — пустой список.
	 */
	get result(): readonly TItem[] {
		if (!this._event) return []

		return this._event.defaultPrevented ? [] : this._event.items
	}
}
