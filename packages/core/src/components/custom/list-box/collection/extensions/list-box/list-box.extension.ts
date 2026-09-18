import type {
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import { bindDisabledToOwner, notifyOwnerDisabled } from '../../../../../base/control'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import { LIST_CONTENT_FIT_ATTRIBUTE, LIST_INDICATOR_ATTRIBUTE } from '../../../../list'
import type { TListIndicator } from '../../../../list'
import type { IListBoxItem } from '../../../item/types'
import type { IListBox, TListBoxView } from '../../../types'
import type { TListBoxExtensionEvents, IListBoxExtensionOptions, IListBoxExtension } from './types'
import { TListBoxItemExtension, type IListBoxItemExtension } from './item'

/**
 * TListBoxExtension — то, что элемент списка знает благодаря коллекции.
 *
 * Пробрасывает на элементы свойства владельца: `size`, `variant`, `view`.
 * `disabled` не пробрасывается, а сочетается: элемент выключен, если выключен
 * сам или выключен список (`bindDisabledToOwner`).
 *
 * Ещё ставит элементам атрибуты для темы: `data-content-fit` — своё значение
 * элемента поверх списочного, `data-indicator` — значение списка. Сами
 * свойства лежат на инстансе списка по контракту `IList`.
 *
 * Через него идёт выбор пользователя (`chooseItem`): и клик по строке, и
 * клавиатура списка. Выключенному элементу он отказывает.
 *
 * Раньше между ним и базой стоял `TListExtension` — ровно тот же код минус
 * `view`. Слой исчез вместе с компонентом `TList`: наследник у него был один.
 * Вместе с ним ушёл дженерик `TItemExt` и второй аргумент конструктора: при
 * своём `TItemExt` умолчание `TListBoxItemExtension` давало адаптер не того
 * типа. Свой адаптер по-прежнему передаётся через `options.itemCtor`.
 */
export class TListBoxExtension<
	TOwner extends IListBox = IListBox,
	TItem extends IListBoxItem = IListBoxItem,
>
	extends TBaseOwnerItemExtension<TItem, IListBoxItemExtension<TItem>, TListBoxExtensionEvents>
	implements IExtension<TItem>, IListBoxExtension<TItem>
{
	readonly name: string = 'list'

	protected readonly _owner: TOwner

	/**
	 * Подписки на собственный `contentFit` элементов, которые сейчас в списке.
	 *
	 * Обработчик у каждого элемента свой: ему нужен элемент, а событие несёт
	 * только значение. Поэтому он хранится до удаления элемента — иначе снять
	 * подписку было бы нечем. `WeakMap` — чтобы запись не удерживала элемент,
	 * если движок выбросят, не удалив из него элементы.
	 */
	private readonly _contentFitWatchers = new WeakMap<TItem, () => void>()

	constructor(options: IListBoxExtensionOptions<TOwner, TItem>) {
		super(TListBoxItemExtension, options)

		this._owner = options.owner
	}

	/** Внешний вид со списка. */
	get view(): TListBoxView | undefined {
		return this._owner.view
	}

	/** Сторона отметки выбранного — со списка. */
	get indicator(): TListIndicator {
		return this._owner.indicator
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._applyOwner(item as TItem))

		// Итог `disabled` элементу отдаёт резольвер — сообщаем тем, у кого он сменился
		this._owner.events.on('change:disabled', () => notifyOwnerDisabled(ctx.driver.valueOf()))

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.driver.valueOf().forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				ctx.driver.valueOf().forEach((item) => {
					item.variant = payload.newValue
				})
			},
		)

		// У `data-content-fit` два источника — список и сам элемент, и атрибут
		// пересчитывается на смену любого из них
		this._owner.events.on('change:contentFit', () => {
			ctx.driver.valueOf().forEach((item) => this._applyContentFit(item as TItem))
		})

		ctx.driver.valueOf().forEach((item) => this._watchContentFit(item))
		ctx.driver.events.on('item:added', (e) => this._watchContentFit(e.item as TItem))
		// Очистка шлёт `item:removed` каждому элементу перед `reset` — отдельной
		// подписки на неё не нужно
		ctx.driver.events.on('item:removed', (e) => this._unwatchContentFit(e.item))

		this._owner.events.on('change:indicator', () => {
			ctx.driver.valueOf().forEach((item) => this._applyIndicator(item as TItem))
		})

		// Внешний вид и сторона отметки доезжают до item-адаптеров
		this.events.relay(this._owner.events, ['change:view', 'change:indicator'])
	}

	/**
	 * Выбор пользователя — клик по строке или Enter и пробел на подсвеченном
	 * элементе: переключить выбор элемента.
	 *
	 * Выключенный элемент не выбирается: он виден и объявляется скринридером
	 * как недоступный, но нажатие по нему ничего не делает. `item.disabled` —
	 * итог, в нём учтён и выключенный список.
	 *
	 * Проверка здесь, а не в `TSelectionExtension`: выбрать выключенный элемент
	 * из кода (`select`, `toggle`) — право приложения.
	 */
	chooseItem(item: TItem): boolean {
		const selection = this._selection

		if (!selection || item.disabled) return false

		selection.toggle(item)

		return true
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as ISelectionExtension<TItem> | undefined
	}

	/**
	 * Свойства владельца, которые элемент получает от него, а не задаёт сам, —
	 * кроме `disabled`: его элемент сочетает со своим.
	 */
	private _applyOwner(item: TItem): void {
		bindDisabledToOwner(item, this._owner)
		item.size = this._owner.size
		item.variant = this._owner.variant

		// Roving tabindex (APG listbox): фокусируем контейнер, элементы — только
		// стрелками (`TListKeyboardPlugin`), не Tab'ом. Без этого Tab перебирал бы
		// элементы по одному — при тысяче опций так невозможно уйти со списка.
		item.aria.add('tabindex', '-1')

		this._applyContentFit(item)
		this._applyIndicator(item)
	}

	/**
	 * `data-indicator` элемента — значение списка целиком.
	 *
	 * Ставит родительское расширение, а не item-адаптер: адаптеры создаются
	 * лениво, а атрибут обязан стоять с первой отрисовки, включая серверную.
	 */
	private _applyIndicator(item: TItem): void {
		item.dataset.add(LIST_INDICATOR_ATTRIBUTE, this._owner.indicator)
	}

	/**
	 * `data-content-fit` элемента: своё значение поверх списочного.
	 *
	 * Разрешение живёт здесь, а не в шаблоне: `:data-content-fit="…"` повторил
	 * бы это правило в каждом из шести адаптеров. `undefined` у элемента
	 * означает «взять у списка» и не то же самое, что `truncate`.
	 */
	private _applyContentFit(item: TItem): void {
		item.dataset.add(LIST_CONTENT_FIT_ATTRIBUTE, item.contentFit ?? this._owner.contentFit)
	}

	/**
	 * Слушать собственный `contentFit` элемента: своё значение меняется и после
	 * добавления — во Vue, например, динамическим пропом `content-fit` у
	 * `ListBox.Item`. Повторный вызов для того же элемента второй подписки не
	 * заводит.
	 */
	private _watchContentFit(item: TItem): void {
		if (this._contentFitWatchers.has(item)) return

		const watcher = (): void => this._applyContentFit(item)

		this._contentFitWatchers.set(item, watcher)
		item.events.on('change:contentFit', watcher)
	}

	/**
	 * Удалённый элемент список больше не слушает: атрибут ему пишет уже не этот
	 * список, а подписка удерживала бы список, пока жив сам элемент.
	 */
	private _unwatchContentFit(item: TItem): void {
		const watcher = this._contentFitWatchers.get(item)

		if (!watcher) return

		item.events.off('change:contentFit', watcher)
		this._contentFitWatchers.delete(item)
	}
}
