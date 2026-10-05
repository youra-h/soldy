import type { IExtension, IExtensionContext } from '../types'
import { TBaseExtension } from '../base-extension.class'
import type { TMetaEntry, TMetaEvents, IMetaExtension } from './types'

/**
 * TMetaExtension — владелец meta-информации элементов коллекции.
 *
 * Единственный читатель `_` из событий insert/update. Превращает сырой meta-снапшот
 * в собственные события `meta:applied` / `meta:changed`, на которые подписываются
 * потребители (activation, selection и т.д.).
 *
 * Устанавливается ДО потребителей, чтобы те могли найти его через ctx.extensions.
 *
 * **Отметки одной записи — одним событием, в её конце.** Пачка (`batch.set`,
 * `patch`) шлёт `item:added` на каждый элемент, и событие на элемент заставляло
 * потребителя ставить отметки по одной: выбор нескольких тысяч строк из данных
 * давал столько же `change:selection`, и каждое подписчики выбора проходили по
 * всей коллекции. Поэтому снимки с `item:added` и `item:updated` копятся, а
 * уходят списком на `change:items`: драйвер шлёт его один раз на запись,
 * изменившую хранилище, — на команду и на весь `batch()`, — следом за всеми её
 * `item:*`. Сначала добавленные — `meta:applied`, следом обновлённые —
 * `meta:changed`; в списке пары идут в порядке записи. Программный `apply`
 * записью не является: список из одной пары уходит сразу.
 *
 * **Помнит последний применённый снимок** — не ради кэша, а ради опоздавших.
 * Событие живёт мгновение: коллекцию можно собрать снаружи
 * (`createEngine({ items: [{ _: { active: true } }] })`) и передать компоненту,
 * который доустановит `activation` уже после. Без памяти такой флаг терялся бы
 * молча — элемент в коллекции есть, а активным не стал. Снимок запоминается
 * сразу, на событии элемента, а не в конце записи.
 *
 * `WeakMap`, чтобы удалённые из коллекции элементы не удерживались.
 *
 * @template TItem — тип элемента коллекции
 */
export class TMetaExtension<TItem extends object = any>
	extends TBaseExtension<TItem, TMetaEvents<TItem>>
	implements IExtension<TItem>, IMetaExtension<TItem>
{
	readonly name = 'meta' as const

	private readonly _snapshots = new WeakMap<TItem, Record<string, unknown>>()

	/** Отметки добавленных текущей записью — уйдут на её `change:items`. */
	private _added: TMetaEntry<TItem>[] = []

	/** Отметки обновлённых текущей записью — уйдут на её `change:items`. */
	private _updated: TMetaEntry<TItem>[] = []

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => {
			if (Object.keys(e._).length === 0) return

			this._added.push(this._remember(e.item as TItem, e._))
		})

		ctx.driver.events.on('item:updated', (e) => {
			if (Object.keys(e._).length === 0) return

			this._updated.push(this._remember(e.item, e._))
		})

		ctx.driver.events.on('change:items', () => this._flush())
	}

	/**
	 * Программный канал: применить meta к уже находящемуся в коллекции элементу.
	 * `meta:applied` со списком из одной пары приходит сразу — это не запись.
	 */
	apply(item: TItem, meta: Record<string, unknown>): void {
		if (!meta || Object.keys(meta).length === 0) return

		this.events.emit('meta:applied', [this._remember(item, meta)])
	}

	/**
	 * Снимок, применённый к элементу раньше.
	 *
	 * Нужен потребителю, который подключился к уже наполненной коллекции: свои
	 * события он пропустил и догоняет по этому снимку.
	 */
	get(item: TItem): Record<string, unknown> | undefined {
		return this._snapshots.get(item)
	}

	/** Запомнить снимок элемента и вернуть пару для события. */
	private _remember(item: TItem, meta: Record<string, unknown>): TMetaEntry<TItem> {
		this._snapshots.set(item, { ...(this._snapshots.get(item) ?? {}), ...meta })

		return { item, meta }
	}

	/**
	 * Отдать отметки записи. Списки забираются до событий: запись, которую
	 * начнёт подписчик, копит уже свои и отдаст их на своём `change:items`.
	 */
	private _flush(): void {
		const added = this._added
		const updated = this._updated

		this._added = []
		this._updated = []

		if (added.length > 0) this.events.emit('meta:applied', added)
		if (updated.length > 0) this.events.emit('meta:changed', updated)
	}
}
