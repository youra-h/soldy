import type { IExtension, IExtensionContext } from '../types'
import type { TBatchEvents, IBatchExtension } from './types'
import {
	TInsertCommand,
	TRemoveCommand,
	TClearCommand,
	TPatchCommand,
	TQueryCommand,
} from '../../commands'
import { TBaseExtension } from '../base-extension.class'

/**
 * TBatchExtension — расширение для пакетных операций
 */
export class TBatchExtension<TItem extends object>
	extends TBaseExtension<TItem, TBatchEvents<TItem>>
	implements IExtension<TItem>, IBatchExtension<TItem>
{
	readonly name = 'batch' as const

	private _trackBy?: (item: TItem) => any

	get trackBy(): ((item: TItem) => any) | undefined {
		return this._trackBy
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// items живут в driver — relay позволяет batch.events реагировать на change:items
		this.events.relay(ctx.driver.events, ['change:items'])

		// Показанное меняется по двум причинам: изменился состав хранилища или
		// изменились условия отбора. Читателю экрана разница не важна — ему в
		// обоих случаях надо перечитать `shown`.
		ctx.driver.events.on('change:items', () => this.events.emit('change:shown'))
		ctx.driver.events.on('items:query:invalidated', () => this.events.emit('change:shown'))
	}

	set trackBy(fn: ((item: TItem) => any) | undefined) {
		if (this._trackBy === fn) return

		this._trackBy = fn

		this.events.emit('change:trackBy', fn)
	}

	/**
	 * Состав хранилища — реальные данные, как они лежат.
	 *
	 * Отбор сюда не вмешивается: скрытые фильтром элементы никуда не делись, и
	 * всё, что пишет в коллекцию или следит за её целостностью, должно видеть
	 * их. Что показано пользователю — это `shown`.
	 */
	get items(): ReadonlyArray<TItem> {
		return this._ctx.driver.valueOf()
	}

	/**
	 * Найти элемент в хранилище — по тому же составу, что отдаёт `items`.
	 *
	 * Скрытый отбором элемент здесь находится: он существует, просто не
	 * показан. Нужен поиск среди показанного — `shown.find()`.
	 */
	set items(items: TItem[]) {
		this.update(items)
	}

	/**
	 * Что показано пользователю — выборка после отбора.
	 *
	 * За геттером стоит `TQueryCommand`: подписчики `items:query:before`
	 * (`filter` и его будущие соседи — сортировка, группировка) успевают
	 * подменить список до отдачи. Хранилище при этом не трогается, поэтому
	 * снятие фильтра возвращает всё как было.
	 *
	 * Читать отсюда должно всё, что показывает: список на экране, навигация с
	 * клавиатуры, пустое состояние, счётчик «показано N».
	 */
	get shown(): ReadonlyArray<TItem> {
		return this._ctx.driver.query(new TQueryCommand<TItem>())
	}

	/**
	 * Сколько элементов в хранилище.
	 *
	 * Именно в хранилище, а не в выборке: при активном отборе это число не
	 * совпадёт с `items.length`. Перенесено из `plain` как есть — `plain`
	 * отвечает за операции над одной записью, счёт состава к ним не относится.
	 */
	get length(): number {
		return this._ctx.driver.valueOf().length
	}

	find(predicate: (item: TItem) => boolean): TItem | undefined {
		return this.items.find(predicate)
	}

	set(items: TItem[]): void {
		if (!items.length) return

		this._ctx.batch(() => {
			items.forEach((item) => {
				// Добавляем в конец, чтобы сохранить порядок items.
				this._ctx.execute(new TInsertCommand(item, this._ctx.driver.valueOf().length))
			})
		})

		this.events.emit('items:added', items)
	}

	update(items: TItem[]): void {
		if (this._trackBy) {
			this.patch(items)
		} else {
			this.clear()
			this.set(items)
		}
	}

	patch(items: TItem[]): void {
		if (!items.length) return

		const trackBy = this._trackBy

		if (!trackBy) {
			throw new Error('trackBy function is not set')
		}

		// Сверка живёт в команде: ей нужен сырой storage, а не выборка из `items`.
		this._ctx.execute(new TPatchCommand(items, trackBy))

		this.events.emit('items:added', items)
	}

	remove(items: TItem[]): void {
		if (!items.length) return

		this._ctx.batch(() => {
			items.forEach((item) => this._ctx.execute(new TRemoveCommand(item)))
		})

		this.events.emit('items:removed', items)
	}

	clear(): void {
		this._ctx.execute(new TClearCommand())
		this.events.emit('items:removed', [])
	}
}
