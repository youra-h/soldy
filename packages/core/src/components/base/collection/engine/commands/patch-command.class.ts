import type { ICommand, ICommandContext } from './types'
import { TInsertCommand } from './insert-command.class'
import { TRemoveCommand } from './remove-command.class'
import { TUpdateCommand } from './update-command.class'

/**
 * Команда сверки состава с входным набором по ключу `trackBy`.
 *
 * Совпавшие обновляются, новые добавляются в конец, пропавшие удаляются.
 *
 * Живёт в командах, а не в `TBatchExtension`, именно ради выборок: карту
 * существующих элементов она строит по **`ctx.storage.items`** — сырому
 * хранилищу, а не по результату `query`. Пока это было написано в расширении
 * через чтение состава наружу, включённый фильтр ломал патч насмерть: скрытые
 * элементы не попадали в карту и на следующем `items = [...]` уходили в
 * `TInsertCommand` как новые, то есть дублировались в storage.
 *
 * Композитная: наружу одна команда (один `change:items` на выходе), внутри —
 * те же `TUpdateCommand` / `TInsertCommand` / `TRemoveCommand`. Так `selection`,
 * реестр контекстов и bundles по-прежнему узнают о судьбе каждого элемента, а
 * не только о том, что «состав изменился».
 */
export class TPatchCommand<TItem> implements ICommand<TItem> {
	private _commands: ICommand<TItem>[] = []

	constructor(
		private _items: TItem[],
		private _trackBy: (item: TItem) => any,
	) {}

	apply(ctx: ICommandContext<TItem>): void {
		const trackBy = this._trackBy

		// Сопоставляем ключи существующим элементам — по сырому хранилищу.
		const itemByKey = new Map<unknown, TItem>()

		for (const item of ctx.storage.items) {
			const key = trackBy(item)

			if (key === undefined) {
				throw new Error('patch: trackBy вернул undefined для элемента коллекции')
			}

			if (!itemByKey.has(key)) {
				itemByKey.set(key, item)
			}
		}

		const matchedKeys = new Set<unknown>()

		for (const source of this._items) {
			const key = trackBy(source)

			if (key === undefined) {
				throw new Error('patch: trackBy вернул undefined для source')
			}

			const existing = itemByKey.get(key)

			if (existing) {
				// Обновляем существующий элемент (последний source побеждает)
				this._run(ctx, new TUpdateCommand<TItem>(existing, source))
				matchedKeys.add(key)
			} else {
				// Добавляем новый элемент в конец (сохраняем порядок).
				// Длина берётся на каждом шаге: предыдущие вставки её уже сдвинули.
				this._run(ctx, new TInsertCommand<TItem>(source, ctx.storage.items.length))
			}
		}

		itemByKey.forEach((item, key) => {
			if (!matchedKeys.has(key)) {
				this._run(ctx, new TRemoveCommand<TItem>(item))
			}
		})
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		this._commands.forEach((command) => command.emitEvents(ctx))
	}

	/** Применить вложенную команду сразу, а её уведомления отложить до `emitEvents`. */
	private _run(ctx: ICommandContext<TItem>, command: ICommand<TItem>): void {
		command.apply(ctx)

		this._commands.push(command)
	}
}
