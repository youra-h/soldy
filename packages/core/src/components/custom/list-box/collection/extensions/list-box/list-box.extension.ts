import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension, selectionOf } from '../../../../../base/collection'
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
 * Отдаёт элементам свойства владельца. `size`, `variant` и `view` расширение
 * пишет элементу значениями списка — их диктует он, а строке элемента их
 * пишет уже сам элемент. `disabled` списка распространяется на элементы, как
 * у `<fieldset>`: выключенный список выключает их, включённый — включает.
 *
 * Ещё ставит элементам атрибуты для темы: `data-content-fit` — своё значение
 * элемента поверх списочного, `data-indicator` — значение списка. Сами
 * свойства лежат на инстансе списка по контракту `IList`. Для скринридера —
 * `aria-selected` всем элементам и `aria-multiselectable` списку в `multiple`,
 * как у Select и Tags, и `tabindex="-1"` строкам (`_applyItem`). Роли пишут
 * сами список и элемент (`listbox`, `option`): от коллекции они не зависят.
 * Место элемента в наборе, пока список рисует окно, пишет не он, а общее
 * расширение `positionInSet` — то же у Select.
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
		let indicator = this.indicator

		ctx.options.watch('owner', (owner, scope) => {
			// `indicator` item-адаптеры читают из расширения — сообщить, если он
			// сменился вместе с владельцем
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
			// них, как у `<fieldset>`, `size`, `variant` и `view` диктует он
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
			scope.on(owner.events, 'change:view', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item as TItem, owner)),
			)

			// У `data-content-fit` два источника — список и сам элемент, и атрибут
			// пересчитывается на смену любого из них
			scope.on(owner.events, 'change:contentFit', () => {
				ctx.driver.valueOf().forEach((item) => this._applyContentFit(item as TItem))
			})

			// Сторона отметки доезжает до элементов и item-адаптеров
			scope.on(owner.events, 'change:indicator', (value: TListIndicator) => {
				indicator = value
				ctx.driver.valueOf().forEach((item) => this._applyIndicator(item as TItem))
				this.events.emit('change:indicator', value)
			})

			// Можно ли выбрать несколько, решает режим выбора — его знает коллекция,
			// а не список: пришедший владелец получает `aria-multiselectable` по
			// текущему режиму, смену режима ловит подписка ниже
			this._syncMultiselectable()
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

		// Смена режима — многовыборность текущему владельцу. Подписка живёт с
		// движком, а не с владельцем, как у Select и Tags: владелец уходит и
		// возвращается, когда компонент пересобирают над тем же движком, а режим
		// у коллекции один
		this._selection?.events.on('change:mode', () => this._syncMultiselectable())
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
	 *
	 * Принятый выбор сообщается событием `choose` — после переключения, когда
	 * значение списка уже новое. Так же сообщает о выборе пользователя
	 * `TSelectExtension`.
	 */
	chooseItem(item: TItem): boolean {
		const selection = this._selection

		if (!selection || item.disabled) return false

		selection.toggle(item)
		this.events.emit('choose', item)

		return true
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return selectionOf(this._ctx)
	}

	/**
	 * Свойства владельца на элементе: `size`, `variant` и `view` — всегда его,
	 * `disabled` — когда владелец выключен. Владельца нет — элемент со своим.
	 */
	private _inheritOwner(item: TItem): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applyStyle(item, owner)

		if (owner.disabled) item.disabled = true
	}

	/** `size`, `variant` и `view` элемента — всегда владельца. */
	private _applyStyle(item: TItem, owner: TOwner): void {
		item.size = owner.size
		item.variant = owner.variant
		item.view = owner.view
	}

	/**
	 * Что элемент получает от списка: место в обходе и атрибуты.
	 *
	 * `tabindex="-1"` — модель фокуса списка (APG Listbox,
	 * `aria-activedescendant`): остановка Tab у списка одна — его узел, а по
	 * элементам ходят стрелки (`TListKeyboardPlugin`). Строка при этом фокус
	 * принимает: клик оставляет его на ней, и клавиша со строки — клавиша
	 * списка с места этой строки, а строку клавиатура находит по атрибуту
	 * (`rowIn`). Без `-1` клик отдавал бы фокус узлу списка. Своего `tabindex`
	 * у строки нет (`TItemRow`), и этот — единственный.
	 */
	private _applyItem(item: TItem): void {
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
	 * `aria-multiselectable` списка — в `multiple`; в `single` и `none`
	 * атрибута нет, как у Select и Tags. Пишет коллекция, а не список: режим
	 * выбора — свойство коллекции, и элементы знают о выборе от неё же.
	 * Владельца нет — писать некуда: пришедший получит атрибут в наблюдателе.
	 */
	private _syncMultiselectable(): void {
		this._ctx.options
			.get('owner')
			?.aria.add('aria-multiselectable', this._selection?.multiple ? 'true' : null)
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
