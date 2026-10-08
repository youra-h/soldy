import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import {
	TBaseOwnerItemExtension,
	TItemContextRegistry,
	TRemoveCommand,
} from '../../../../../base/collection'
import type { ITagsItem } from '../../../item/types'
import type { ITags } from '../../../types'
import type {
	TTagsExtensionEvents,
	TTagsEngineOptions,
	TTagsExtensions,
	ITagsExtension,
} from './types'
import { TTagsItemExtension, type ITagsItemExtension } from './item'

/**
 * TTagsExtension — то, что тег знает благодаря коллекции.
 *
 * Владелец — опция движка (`owner`): он приходит и уходит после сборки, и
 * расширение наблюдает его (`ctx.options.watch`).
 *
 * Четыре обязанности:
 *
 * 1. **Размер** тега диктует набор — как у `TListBoxExtension`/
 *    `TTabsExtension`, расширение пишет его значением набора. `disabled`
 *    набора распространяется на теги, как у `<fieldset>`. **Вариант** (цвет)
 *    у тега свой, и расширение его не пишет: так в одном наборе бывают теги
 *    разного цвета. Тег без своего варианта тема красит вариантом набора — с
 *    класса набора (`s-tags--variant-<v>`), а свой модификатор тега его
 *    перекрывает. Писать вариант набора тегу «если своего нет» значило бы
 *    завести второй путь: в одном поле не различить, задал ли его потребитель
 *    или записал набор.
 * 2. **Закрытие** — `closeTag`, копия `closeTab` у Tabs: закрывает только
 *    тег, закрываемый по своему item-адаптеру (выключенный — нет), и эмитит
 *    `item:close` перед удалением.
 * 3. **Роль набора**, когда у коллекции включён выбор. Tags — не список
 *    (`role="list"`/`"listitem"`), а `listbox`/`option` с `aria-selected`,
 *    как только `selection.mode` перестаёт быть `none`. Пишет это
 *    расширение, а не элемент и не `TSelectionExtension`: тот общий для всех
 *    коллекций, а конкретная пара ролей — знание Tags.
 * 4. **Остановка Tab** — roving tabindex по паттерну APG Listbox, пока выбор
 *    включён: весь набор — одна остановка, между тегами ходят стрелки
 *    (`TTagsKeyboardPlugin`). Кнопка закрытия из порядка Tab выведена — тег
 *    закрывает `Delete`. В `none` у строки нет действия, и остановок у строк
 *    нет вовсе, а крестик остаётся нативной остановкой: иначе тег с
 *    клавиатуры не закрыть.
 *
 * Вид набора (`TTags.view`) тегам, в отличие от ListBox, не доставляется:
 * пилюлю тега тема рисует по модификатору набора, и копия значения на
 * элементе была бы вторым путём к тем же данным. Вариант набора — так же.
 */
export class TTagsExtension<TOwner extends ITags = ITags, TItem extends ITagsItem = ITagsItem>
	extends TBaseOwnerItemExtension<
		TItem,
		ITagsItemExtension<TItem>,
		TTagsExtensionEvents,
		TTagsEngineOptions<TOwner>
	>
	implements IExtension<TItem>, ITagsExtension<TItem>
{
	readonly name = 'tags' as const

	private _itemRegistry!: TItemContextRegistry<TItem, TTagsExtensions<TItem>>

	/**
	 * Тег, на котором последним был фокус, пока он в коллекции.
	 *
	 * В отличие от Tabs, фокус и выбор здесь расходятся: стрелка переносит
	 * фокус, а выбирает пробел. Остановка, посчитанная по одному выбору,
	 * перескакивала бы с тега под фокусом на первый выбранный, поэтому она
	 * помнит фокус. DOM ядру недоступен — о фокусе сообщает плагин
	 * клавиатуры (`notifyFocus`).
	 */
	private _focused: TItem | undefined

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, ITagsItemExtension<TItem>>) {
		super(TTagsItemExtension, options)
	}

	/** Глобальный closable с инстанса TTags. Владельца нет — закрывать нельзя. */
	get closable(): boolean {
		return this._ctx.options.get('owner')?.closable ?? false
	}

	override install(ctx: IExtensionContext<TItem, TTagsEngineOptions<TOwner>>): void {
		super.install(ctx)

		this._itemRegistry = new TItemContextRegistry({
			extensions: ctx.extensions as TTagsExtensions<TItem>,
			driver: ctx.driver,
		})

		// При добавлении элемента — свойства владельца, если он есть
		ctx.driver.events.on('item:added', (e) => this._inheritOwner(e.item as TItem))

		// Патч пишет элементу своё из данных — свойства владельца поверх
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item as TItem))

		const selection = ctx.extensions.selection as ISelectionExtension<TItem> | undefined

		if (selection) {
			selection.events.on('change:mode', () => this._applyMode())
			selection.events.on('change:selection', () => this._syncSelectedAria())

			// Добавленному — только его роль: набор ряда от состава не зависит, а
			// проход по всем на каждый `item:added` пачки сделал бы наполнение
			// квадратичным
			ctx.driver.events.on('item:added', (e) =>
				this._applyItemRole(e.item as TItem, selection),
			)

			this._applyMode()
		}

		// Остановка Tab зависит от режима, от выбора, от тега под фокусом, от
		// состава и порядка набора и от того, можно ли перейти на каждый тег.
		// `change:items` приходит один раз на команду — после всех `item:*`
		ctx.driver.valueOf().forEach((item) => this._watchTag(item))
		ctx.driver.events.on('item:added', (e) => this._watchTag(e.item as TItem))
		ctx.driver.events.on('item:removed', (e) => this._unwatchTag(e.item))
		ctx.driver.events.on('change:items', () => this._syncTabStop())
		selection?.events.on('change:mode', () => this._syncTabStop())
		selection?.events.on('change:selection', () => this._syncTabStop())

		this._syncTabStop()

		// Владелец — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился владелец, прежние сняты
		let closable = this.closable

		ctx.options.watch('owner', (owner, scope) => {
			// `closable` тегов читают из расширения — сообщить, если он сменился
			// вместе с владельцем
			if (closable !== this.closable) {
				closable = this.closable
				this.events.emit('change:closable', closable)
			}

			if (!owner) return

			// Догон: элементы, лежавшие до прихода владельца, и роль его ряда
			ctx.driver.valueOf().forEach((item) => this._inheritOwner(item))
			this._applyMode()

			// Смена у владельца — всем элементам: `disabled` распространяется на
			// них, как у `<fieldset>`, `size` диктует он. Вариант тега свой —
			// смена варианта у набора тегов не трогает
			scope.on(owner.events, 'change:disabled', (value: boolean) => {
				ctx.driver.valueOf().forEach((item) => {
					item.disabled = value
				})
			})
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((item) => this._applySize(item, owner)),
			)

			// Глобальный closable — в item-адаптеры (TTagsItemExtension резолвит
			// closable из item ?? owner)
			scope.on(owner.events, 'change:closable', (value: boolean) => {
				closable = value
				this.events.emit('change:closable', value)
			})
		})
	}

	/**
	 * Свойства владельца на элементе: `size` — всегда его, `disabled` — когда
	 * владелец выключен. Владельца нет — элемент со своим. Вариант тега свой
	 * и сюда не входит.
	 */
	private _inheritOwner(item: TItem): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applySize(item, owner)

		if (owner.disabled) item.disabled = true
	}

	/** `size` элемента — всегда владельца. */
	private _applySize(item: TItem, owner: TOwner): void {
		item.size = owner.size
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx.extensions.selection as ISelectionExtension<TItem> | undefined
	}

	/**
	 * Роль набора и его тегов зависит от режима выбора: `list`/`listitem`,
	 * пока `mode === 'none'`, иначе `listbox`/`option` — как APG listbox.
	 *
	 * У `listbox` набор объявляет и то, что знает только он: теги идут в ряд
	 * (`aria-orientation="horizontal"` — умолчание listbox вертикальное), и в
	 * `multiple` выбрать можно несколько (`aria-multiselectable`). У `list`
	 * таких атрибутов нет — оба снимаются.
	 *
	 * Что написал потребитель (`aria-label`), не трогаем: это его знание о
	 * корне. Владельца нет — набора тоже, роли пишутся только тегам.
	 */
	private _applyMode(): void {
		const selection = this._selection

		if (!selection) return

		const selecting = selection.mode !== 'none'
		const owner = this._ctx.options.get('owner')

		if (owner) {
			owner.aria.add('role', selecting ? 'listbox' : 'list')
			owner.aria.add('aria-orientation', selecting ? 'horizontal' : null)
			owner.aria.add('aria-multiselectable', selection.multiple ? 'true' : null)
		}

		this._ctx.driver.valueOf().forEach((item) => this._applyItemRole(item, selection))
	}

	/**
	 * Роль тега и кнопка закрытия в его режиме.
	 *
	 * Внутри listbox второй остановки Tab быть не должно: крестик выведен из
	 * порядка Tab (`tabindex="-1"`), тег закрывает `Delete`, как у таба. В
	 * `none` строка остановкой не бывает, и нативная кнопка остаётся
	 * единственным путём закрыть тег с клавиатуры — `tabindex` снят.
	 */
	private _applyItemRole(item: TItem, selection: ISelectionExtension<TItem>): void {
		if (selection.mode === 'none') {
			item.aria.add('role', 'listitem')
			item.aria.add('aria-selected', null)
			item.closeAria.add('tabindex', null)

			return
		}

		item.aria.add('role', 'option')
		item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
		item.closeAria.add('tabindex', '-1')
	}

	/**
	 * `aria-selected` стоит на **всех** тегах, а не только на выбранных:
	 * скринридер объявляет «2 из 7, не выбран», и для этого нужен атрибут на
	 * каждом. Не трогает роль — только режимы, где выбор уже включён.
	 */
	private _syncSelectedAria(): void {
		const selection = this._selection

		if (!selection || selection.mode === 'none') return

		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
		})
	}

	/**
	 * Тег, который держит остановку Tab, пока выбор включён.
	 *
	 * Тег под фокусом, если на него можно перейти: стрелка перенесла на него
	 * фокус, и выбор пробелом остановку с него не уводит. Иначе — первый
	 * выбранный из тех, на которые можно перейти (по APG вход в listbox — на
	 * выбранную опцию), иначе первый такой по порядку. В `none` остановки
	 * нет: у `listitem` нет действия. Нет ни одного тега, на который можно
	 * перейти, — нет и остановки.
	 */
	get tabStop(): TItem | undefined {
		const selection = this._selection

		if (!selection || selection.mode === 'none') return undefined

		const focused = this._focused

		if (focused && this.isEnabledTag(focused)) return focused

		const items = this._ctx.driver.valueOf()

		return (
			items.find((item) => selection.isSelected(item) && this.isEnabledTag(item)) ??
			items.find((item) => this.isEnabledTag(item))
		)
	}

	/**
	 * Сообщить, что фокус на теге, — так стрелки, клик и `focus()` двигают
	 * остановку одним путём. Зовёт плагин клавиатуры: DOM ядру недоступен.
	 *
	 * Тег, на который нельзя перейти, остановку не забирает: остаётся прежняя.
	 * Тег не из коллекции не запоминается вовсе.
	 */
	notifyFocus(item: TItem): void {
		if (item === this._focused || !this.isEnabledTag(item)) return

		if (!this._ctx.driver.valueOf().includes(item)) return

		this._focused = item
		this._syncTabStop()
	}

	/**
	 * Тег, на который можно перейти: не disabled, visible и rendered.
	 *
	 * Публичный, потому что правило одно на всех: по нему считаются остановка
	 * Tab и навигация с клавиатуры. Копия в плагине однажды разошлась бы с
	 * остановкой.
	 */
	isEnabledTag(item: TItem): boolean {
		return !item.disabled && item.visible && item.rendered
	}

	/**
	 * Roving tabindex по паттерну APG Listbox: `tabindex="0"` только у
	 * `tabStop`, у остальных строк `-1`. В `none` остановки нет, и `-1` у всех:
	 * строка — `Button` на `div`, и без `-1` осталась бы её собственная
	 * остановка, пустая у `listitem`. Так Tab не ловят и строки тегов в поле
	 * Select.
	 *
	 * Пишет родительское расширение, а не плагин: атрибут обязан стоять с
	 * первой отрисовки, включая серверную.
	 */
	private _syncTabStop(): void {
		const stop = this.tabStop

		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('tabindex', item === stop ? '0' : '-1')
		})
	}

	/** Повод пересчитать остановку: сменилось, можно ли перейти на тег. */
	private readonly _onTagAvailability = (): void => this._syncTabStop()

	private _watchTag(item: TItem): void {
		item.events.on('change:disabled', this._onTagAvailability)
		item.events.on('change:visible', this._onTagAvailability)
		item.events.on('change:rendered', this._onTagAvailability)
	}

	/**
	 * Удалённый тег больше не двигает остановку набора, в котором его нет, и
	 * забывается как тег под фокусом.
	 */
	private _unwatchTag(item: TItem): void {
		item.events.off('change:disabled', this._onTagAvailability)
		item.events.off('change:visible', this._onTagAvailability)
		item.events.off('change:rendered', this._onTagAvailability)

		if (this._focused === item) this._focused = undefined
	}

	/**
	 * Закрыть тег (удалить элемент из коллекции).
	 * Если тег нельзя закрыть — ничего не делает. Решает `closable` его
	 * item-адаптера, то же, что видит разметка: выключенный тег не закрывается.
	 */
	closeTag(item: ITagsItem): boolean {
		const { tags } = this._itemRegistry.get(item as TItem).adapters

		if (!tags.closable) return false

		this.events.emit('item:close', item as TItem)

		this._ctx.execute(new TRemoveCommand(item as TItem))

		return true
	}
}
