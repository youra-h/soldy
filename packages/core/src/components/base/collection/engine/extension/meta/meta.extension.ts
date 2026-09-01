import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import type { TMetaEvents, IMetaExtension } from './types'

/**
 * TMetaExtension — владелец meta-информации элементов коллекции.
 *
 * Единственный читатель `_` из событий insert/update. Превращает сырой meta-снапшот
 * в собственные события `meta:applied` / `meta:changed`, на которые подписываются
 * потребители (activation, selection и т.д.).
 *
 * Устанавливается ДО потребителей, чтобы те могли найти его через ctx.extensions.
 *
 * @template TItem — тип элемента коллекции
 */
export class TMetaExtension<TItem extends object = any>
	extends TBaseExtension<TItem, TMetaEvents<TItem>>
	implements IExtension<TItem>, IMetaExtension<TItem>
{
	readonly name = 'meta' as const

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => {
			if (Object.keys(e._).length === 0) return

			this.events.emit('meta:applied', e.item as TItem, e._)
		})

		ctx.driver.events.on('item:updated', (e) => {
			if (Object.keys(e._).length === 0) return

			this.events.emit('meta:changed', e.item as TItem, e._)
		})
	}

	/** Программный канал: применить meta к уже находящемуся в коллекции элементу. */
	apply(item: TItem, meta: Record<string, unknown>): void {
		if (!meta || Object.keys(meta).length === 0) return

		this.events.emit('meta:applied', item, meta)
	}
}
