import type { IExtension, IExtensionContext } from '../../../../../base/collection'
import { TBaseExtension, TInsertCommand } from '../../../../../base/collection'
import type { TSwipeSide } from '../../../../../base/layer'
import type { IToasts, TToastsPlacement } from '../../../types'
import TToastsItem from '../../../item/item.class'
import type { IToastsItem } from '../../../item/types'
import type {
	IToastsExtension,
	TToastInput,
	TToastsEngineOptions,
	TToastsExtensionEvents,
} from './types'

/**
 * Добавленный элемент — тост. Вставка отдаёт его как вход (`Partial`), а
 * экземпляром его делает фабрика движка: без неё в коллекции лежали бы сырые
 * объекты, и следить за ними нечем.
 */
function isToast(value: Partial<IToastsItem>): value is IToastsItem {
	return value instanceof TToastsItem
}

/**
 * Куда тост уходит жестом — от места региона: у боковых мест к своему краю
 * строки, у мест по центру — к краю окна, вверх или вниз. Туда же тема уводит
 * закрытый тост.
 */
function swipeSideOf(placement: TToastsPlacement): TSwipeSide {
	if (placement === 'top') return 'top'
	if (placement === 'bottom') return 'bottom'

	return placement.endsWith('-start') ? 'start' : 'end'
}

/**
 * TToastsExtension — очередь тостов поверх стандартной коллекции.
 *
 * Своего массива тостов нет: тосты лежат в хранилище движка, показанные —
 * выборка `batch.shown`. Владелец — опция движка (`owner`): он приходит и
 * уходит после сборки, и расширение наблюдает его (`ctx.options.watch`).
 *
 * Обязанности:
 *
 * 1. **Вставка** — `show`: новый тост встаёт в начало коллекции, на экране он
 *    у края окна. Поле со стрелкой, а не метод: `const { show } =
 *    useToasts()` не теряет `this`.
 * 2. **Предел видимых** — в `items:query:before` показаны первые `max`
 *    владельца, остальные ждут и возвращаются, когда место освободится.
 *    Закрытый тост место держит, пока гаснет: он ещё в коллекции. Смена
 *    `max` — `invalidateQuery()`, своего флага под выборку нет.
 * 3. **Сторона жеста** — от места региона (`swipeSideOf`): добавленному тосту
 *    и всем тостам на смену места.
 * 4. **Подъём региона** — на каждый добавленный тост владелец встаёт в
 *    общем стеке выше всех слоёв: новое уведомление видно поверх окна,
 *    открытого раньше.
 * 5. **Длительность** — `durationOf`: своя у тоста, иначе владельца; смена
 *    итога — событие `item:duration`, по нему плагин таймера начинает отсчёт
 *    заново.
 * 6. **Закрытие** — событие `item:close`: тост закрылся. Закрытие
 *    окончательное, поэтому событие приходит один раз. Удаляет закрытый тост
 *    из коллекции плагин владельца, когда доиграли переходы его узла.
 *
 * Item-адаптера у расширения нет, как у `filter`: всё, что тост знает о
 * себе, — его собственные свойства, а итог по тосту (`durationOf`) считается
 * от двух значений сразу.
 */
export class TToastsExtension<TOwner extends IToasts = IToasts>
	extends TBaseExtension<IToastsItem, TToastsExtensionEvents, TToastsEngineOptions<TOwner>>
	implements IExtension<IToastsItem>, IToastsExtension
{
	readonly name = 'toasts' as const

	/** Подписки расширения на тосты коллекции: снятие — по тосту. */
	private readonly _watched = new Map<IToastsItem, () => void>()

	override install(ctx: IExtensionContext<IToastsItem, TToastsEngineOptions<TOwner>>): void {
		super.install(ctx)

		ctx.driver.events.on('items:query:before', (e) => {
			const owner = ctx.options.get('owner')

			// Без владельца предела нет: тосты некому показывать
			if (!owner) return

			e.items = e.items.slice(0, Math.max(0, owner.max))
		})

		ctx.driver.valueOf().forEach((toast) => this._watch(toast))
		ctx.driver.events.on('item:added', (e) => {
			if (isToast(e.item)) this._added(e.item)
		})
		ctx.driver.events.on('item:removed', (e) => this._unwatch(e.item))

		let initial = true

		ctx.options.watch('owner', (owner, scope) => {
			// Предел видимых — владельца: пришёл или ушёл — выборка другая
			if (!initial) ctx.driver.invalidateQuery()

			initial = false

			if (!owner) return

			// Догон: тосты, лежавшие до прихода владельца
			ctx.driver.valueOf().forEach((toast) => this._applySide(toast, owner))

			scope.on(owner.events, 'change:max', () => ctx.driver.invalidateQuery())
			scope.on(owner.events, 'change:placement', () =>
				ctx.driver.valueOf().forEach((toast) => this._applySide(toast, owner)),
			)
			// Длительность владельца — итог тостов без своей
			scope.on(owner.events, 'change:duration', () =>
				ctx.driver.valueOf().forEach((toast) => {
					if (toast.duration === undefined) this.events.emit('item:duration', toast)
				}),
			)
		})
	}

	/**
	 * Показать тост: текст или опции. Новый тост встаёт первым — на экране он у
	 * края окна. Возвращает тост — экземпляр ядра, его можно поправить или
	 * закрыть; вставку отменили (`item:add:before`) — `undefined`.
	 *
	 * Тост собирает фабрика движка из опций, как элемент из данных (`items`):
	 * свой класс тоста у движка — свой и здесь.
	 */
	readonly show = (input: TToastInput): IToastsItem | undefined => {
		const source = typeof input === 'string' ? { text: input } : { ...input }
		const command = new TInsertCommand<IToastsItem>(source, 0)

		this._ctx.execute(command)

		if (!command.changed) return undefined

		// Фабрика заменила опции экземпляром — тот, что лёг в хранилище
		return this._ctx.driver.valueOf().find((toast) => toast === command.item)
	}

	/** Длительность тоста, мс: своя, а если её нет — владельца. `0` — не закрывается сам. */
	durationOf(toast: IToastsItem): number {
		return toast.duration ?? this._ctx.options.get('owner')?.duration ?? 0
	}

	/** Добавленный тост: подписки, сторона жеста и подъём региона над слоями. */
	private _added(toast: IToastsItem): void {
		this._watch(toast)

		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applySide(toast, owner)
		owner.raise()
	}

	private _applySide(toast: IToastsItem, owner: TOwner): void {
		toast.swipeSide = swipeSideOf(owner.placement)
	}

	/** Закрытие и своя длительность тоста — в события расширения. */
	private _watch(toast: IToastsItem): void {
		if (this._watched.has(toast)) return

		const onOpen = (open: boolean): void => {
			if (!open) this.events.emit('item:close', toast)
		}
		const onDuration = (): void => this.events.emit('item:duration', toast)

		toast.events.on('change:open', onOpen)
		toast.events.on('change:duration', onDuration)

		this._watched.set(toast, () => {
			toast.events.off('change:open', onOpen)
			toast.events.off('change:duration', onDuration)
		})
	}

	private _unwatch(toast: IToastsItem): void {
		this._watched.get(toast)?.()
		this._watched.delete(toast)
	}
}
