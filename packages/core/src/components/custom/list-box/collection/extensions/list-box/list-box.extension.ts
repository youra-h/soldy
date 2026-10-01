import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import {
	LIST_CONTENT_FIT_ATTRIBUTE,
	LIST_DEFAULTS,
	LIST_INDICATOR_ATTRIBUTE,
} from '../../../../list'
import type { TListIndicator } from '../../../../list'
import type { IListBoxItem } from '../../../item/types'
import type { IListBox, TListBoxView } from '../../../types'
import type { TListBoxExtensionEvents, TListBoxEngineOptions, IListBoxExtension } from './types'
import { TListBoxItemExtension, type IListBoxItemExtension } from './item'

/**
 * TListBoxExtension — то, что элемент списка знает благодаря коллекции.
 *
 * Владелец — опция движка (`owner`): он приходит и уходит после сборки, и
 * расширение наблюдает его (`ctx.options.watch`). Без владельца у списка
 * значения по умолчанию.
 *
 * Отдаёт элементам свойства владельца. `view` — читая со списка. `size` и
 * `variant` расширение пишет элементу значениями списка — их диктует он.
 * `disabled` списка распространяется на элементы, как у `<fieldset>`:
 * выключенный список выключает их, включённый — включает.
 *
 * Ещё ставит элементам атрибуты для темы: `data-content-fit` — своё значение
 * элемента поверх списочного, `data-indicator` — значение списка. Сами
 * свойства лежат на инстансе списка по контракту `IList`. Для скринридера —
 * `aria-selected` всем элементам, как у Select и Tags.
 *
 * Через него идёт выбор пользователя (`chooseItem`): и клик по строке, и
 * клавиатура списка. Выключенному элементу он отказывает.
 *
 * Раньше между ним и базой стоял `TListExtension` — ровно тот же код минус
 * `view`. Слой исчез вместе с компонентом `TList`: наследник у него был один.
 * Вместе с ним ушёл дженерик `TItemExt`: при своём `TItemExt` умолчание
 * `TListBoxItemExtension` давало адаптер не того типа. Свой адаптер
 * по-прежнему передаётся через `options.itemCtor`.
 */
export class TListBoxExtension<
	TOwner extends IListBox = IListBox,
	TItem extends IListBoxItem = IListBoxItem,
>
	extends TBaseOwnerItemExtension<
		TItem,
		IListBoxItemExtension<TItem>,
		TListBoxExtensionEvents,
		TListBoxEngineOptions<TOwner>
	>
	implements IExtension<TItem>, IListBoxExtension<TItem>
{
	readonly name: string = 'list'

	/**
	 * Подписки на собственный `contentFit` элементов, которые сейчас в списке.
	 *
	 * Обработчик у каждого элемента свой: ему нужен элемент, а событие несёт
	 * только значение. Поэтому он хранится до удаления элемента — иначе снять
	 * подписку было бы нечем. `WeakMap` — чтобы запись не удерживала элемент,
	 * если движок выбросят, не удалив из него элементы.
	 */
	private readonly _contentFitWatchers = new WeakMap<TItem, () => void>()

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IListBoxItemExtension<TItem>>) {
		super(TListBoxItemExtension, options)
	}

	/** Внешний вид со списка. Владельца нет — вида тоже. */
	get view(): TListBoxView | undefined {
		return this._ctx.options.get('owner')?.view
	}

	/** Сторона отметки выбранного — со списка. Владельца нет — по умолчанию. */
	get indicator(): TListIndicator {
		return this._ctx.options.get('owner')?.indicator ?? LIST_DEFAULTS.indicator
	}

	override install(ctx: IExtensionContext<TItem, TListBoxEngineOptions<TOwner>>): void {
		super.install(ctx)

		ctx.driver.events.on('item:added', (e) => {
			this._inheritOwner(e.item as TItem)
			this._applyItem(e.item as TItem)
		})

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._applyItem(item as TItem))

		// Патч пишет элементу своё из данных — свойства владельца поверх
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item as TItem))

		// Владелец — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился владелец, прежние сняты
		let view = this.view
		let indicator = this.indicator

		ctx.options.watch('owner', (owner, scope) => {
			// `view` и `indicator` item-адаптеры читают из расширения — сообщить,
			// если они сменились вместе с владельцем
			if (view !== this.view) {
				view = this.view
				this.events.emit('change:view', view)
			}

			if (indicator !== this.indicator) {
				indicator = this.indicator
				this.events.emit('change:indicator', indicator)
			}

			// Атрибуты темы — от текущего владельца или от умолчаний
			ctx.driver.valueOf().forEach((item) => {
				this._applyContentFit(item as TItem)
				this._applyIndicator(item as TItem)
			})

			if (!owner) return

			// Догон: элементы, лежавшие до прихода владельца
			ctx.driver.valueOf().forEach((item) => this._inheritOwner(item as TItem))

			// Смена у владельца — всем элементам: `disabled` распространяется на
			// них, как у `<fieldset>`, `size` и `variant` диктует он
			scope.on(owner.events, 'change:disabled', (value: boolean) => {
				ctx.driver.valueOf().forEach((item) => {
					item.disabled = value
				})
			})
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item as TItem, owner)),
			)
			scope.on(owner.events, 'change:variant', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item as TItem, owner)),
			)

			// У `data-content-fit` два источника — список и сам элемент, и атрибут
			// пересчитывается на смену любого из них
			scope.on(owner.events, 'change:contentFit', () => {
				ctx.driver.valueOf().forEach((item) => this._applyContentFit(item as TItem))
			})

			// Сторона отметки и внешний вид доезжают до элементов и item-адаптеров
			scope.on(owner.events, 'change:indicator', (value: TListIndicator) => {
				indicator = value
				ctx.driver.valueOf().forEach((item) => this._applyIndicator(item as TItem))
				this.events.emit('change:indicator', value)
			})
			scope.on(owner.events, 'change:view', (value: TListBoxView | undefined) => {
				view = value
				this.events.emit('change:view', value)
			})
		})

		ctx.driver.valueOf().forEach((item) => this._watchContentFit(item))
		ctx.driver.events.on('item:added', (e) => this._watchContentFit(e.item as TItem))
		// Очистка шлёт `item:removed` каждому элементу перед `reset` — отдельной
		// подписки на неё не нужно
		ctx.driver.events.on('item:removed', (e) => this._unwatchContentFit(e.item))

		// Выбор, сложившийся до установки (`value` стоит раньше `list`), догоняет
		// `_applyItem` выше: он ставит `aria-selected` по текущему выбору
		this._selection?.events.on('change:selection', () => {
			ctx.driver.valueOf().forEach((item) => this._applySelectedAria(item as TItem))
		})
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
	 * Свойства владельца на элементе: `size` и `variant` — всегда его,
	 * `disabled` — когда владелец выключен. Владельца нет — элемент со своим.
	 */
	private _inheritOwner(item: TItem): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applyStyle(item, owner)

		if (owner.disabled) item.disabled = true
	}

	/** `size` и `variant` элемента — всегда владельца. */
	private _applyStyle(item: TItem, owner: TOwner): void {
		item.size = owner.size
		item.variant = owner.variant
	}

	/** Что элемент получает от списка: место в обходе и атрибуты. */
	private _applyItem(item: TItem): void {
		// Roving tabindex (APG listbox): фокусируем контейнер, элементы — только
		// стрелками (`TListKeyboardPlugin`), не Tab'ом. Без этого Tab перебирал бы
		// элементы по одному — при тысяче опций так невозможно уйти со списка.
		item.aria.add('tabindex', '-1')

		this._applySelectedAria(item)
		this._applyContentFit(item)
		this._applyIndicator(item)
	}

	/**
	 * `aria-selected` стоит на **всех** элементах, а не только на выбранных:
	 * скринридер объявляет «2 из 7, не выбрана», и для этого нужен атрибут.
	 *
	 * Пишет родительское расширение, а не шаблон: раньше атрибут считала
	 * разметка Vue (`String(selected)`), и каждый адаптер повторял бы это
	 * правило у себя. Отсюда он попадает в набор `aria` элемента — и в первую
	 * же отрисовку, включая серверную.
	 */
	private _applySelectedAria(item: TItem): void {
		const selection = this._selection

		if (selection) item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
	}

	/**
	 * `data-indicator` элемента — значение списка целиком.
	 *
	 * Ставит родительское расширение, а не item-адаптер: адаптеры создаются
	 * лениво, а атрибут обязан стоять с первой отрисовки, включая серверную.
	 */
	private _applyIndicator(item: TItem): void {
		item.dataset.add(LIST_INDICATOR_ATTRIBUTE, this.indicator)
	}

	/**
	 * `data-content-fit` элемента: своё значение поверх списочного.
	 *
	 * Разрешение живёт здесь, а не в шаблоне: `:data-content-fit="…"` повторил
	 * бы это правило в каждом из шести адаптеров. `undefined` у элемента
	 * означает «взять у списка» и не то же самое, что `truncate`.
	 */
	private _applyContentFit(item: TItem): void {
		const listContentFit =
			this._ctx.options.get('owner')?.contentFit ?? LIST_DEFAULTS.contentFit

		item.dataset.add(LIST_CONTENT_FIT_ATTRIBUTE, item.contentFit ?? listContentFit)
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
