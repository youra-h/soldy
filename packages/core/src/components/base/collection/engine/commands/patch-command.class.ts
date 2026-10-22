import type { ICommand, ICommandContext } from './types'
import type { TCollectionEngineItemSource } from '../types'
import { TInsertCommand } from './insert-command.class'
import { TRemoveCommand } from './remove-command.class'
import { TUpdateCommand } from './update-command.class'

/**
 * Команда сверки состава с входным набором по ключу `trackBy`.
 *
 * Совпавшие обновляются, новые добавляются в конец, пропавшие удаляются — те,
 * кого вправе снять (`removable`, по умолчанию все). Кого снимать нельзя,
 * решает тот, кто сверку запускает: команда о причинах не знает. Совпадения
 * ищутся по всему хранилищу, поэтому элемент, которого снимать нельзя, с
 * ключом из входа обновляется, а не дублируется.
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
 *
 * Входной набор команда только проходит, поэтому он только для чтения: состав,
 * объявленный константой, уходит сюда без копии.
 */
export class TPatchCommand<TItem> implements ICommand<TItem> {
	private _commands: ICommand<TItem>[] = []

	constructor(
		private _items: ReadonlyArray<TCollectionEngineItemSource<TItem>>,
		private _trackBy: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown,
		/** Можно ли снять элемент, чьего ключа во входе нет. По умолчанию — любой. */
		private _removable: (item: TItem) => boolean = () => true,
	) {}

	get changed(): boolean {
		return this._commands.some((command) => command.changed)
	}

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
				// Добавляем новый элемент в конец (сохраняем порядок): позицию
				// команда берёт в момент вставки — предыдущие её уже сдвинули
				this._run(ctx, new TInsertCommand<TItem>(source))
			}
		}

		itemByKey.forEach((item, key) => {
			if (!matchedKeys.has(key) && this._removable(item)) {
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
