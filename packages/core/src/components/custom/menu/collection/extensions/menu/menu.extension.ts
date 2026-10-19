import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension, selectionOf } from '../../../../../base/collection'
import type { IMenuItem } from '../../../item/types'
import type { IMenuOwner } from '../../../types'
import type { IMenuSubmenu } from '../../../submenu/types'
import { isMenuSubmenu } from '../../../submenu/submenu.class'
import type { IMenuExtension, TMenuEngineOptions, TMenuExtensionEvents } from './types'
import { TMenuItemExtension, type IMenuItemExtension } from './item'

/**
 * TMenuExtension — то, что пункт знает благодаря меню.
 *
 * Владелец — опция движка (`owner`): он приходит и уходит после сборки, и
 * расширение наблюдает его (`ctx.options.watch`). Владелец — меню или пункт
 * с подменю (`IMenuOwner`): у каждого уровня меню своя коллекция, и для
 * пунктов подменю расширение то же, что для пунктов меню.
 *
 * Четыре обязанности:
 *
 * 1. **Остановка Tab.** У меню её нет вовсе: в меню ведут кнопка и клавиши, а
 *    Tab закрывает его (APG Menu Button). Поэтому каждому пункту —
 *    `tabindex="-1"`: строка держит фокус, когда на ней подсветка, но в обход
 *    Tab не входит, и остановку, которую `Button` на `div` ставит себе сам,
 *    набор пункта перекрывает. Пишет коллекция, а не плагин: атрибут обязан
 *    стоять с первой отрисовки, включая серверную.
 * 2. **Отметка флажков.** Отметка — выбор коллекции (режим `multiple`), и
 *    `aria-checked` флажку пишет меню: что пункт отмечается, знает пункт
 *    (`checkable`), а отмечен ли — коллекция. Всем флажкам, а не только
 *    отмеченным: скринридер объявляет «не отмечено», и для этого нужен
 *    атрибут. У действия `aria-checked` нет.
 * 3. **Размер** пункта диктует меню, как у `TListBoxExtension`. **Вариант** у
 *    пункта свой, как у тега (`docs/agents/collections.md`, «`size` и
 *    `variant` элемента»): «опасный» пункт вроде «Удалить» красится своим
 *    цветом. Вариант меню пункту не пишется вовсе: пункт без своего тема
 *    красит вариантом меню — с класса панели (`so-menu__panel--variant-<v>`),
 *    а свой модификатор пункта сильнее. Писать вариант меню пункту «если
 *    своего нет» значило бы завести второй путь: в одном поле не различить,
 *    задал ли его потребитель или записало меню.
 * 4. **Подменю.** Открыто одно: открывшееся закрывает прежнее, а закрывшееся
 *    меню закрывает открытое (и оно — свои, до самого нижнего уровня). Выбор
 *    в подменю доходит сюда событием подменю (`choose`) и закрывает это меню
 *    так же, как выбор своего пункта.
 *
 * Через него идёт нажатие пункта: `chooseItem` у действия, `toggleItem` у
 * флажка, `openItem` у пункта с подменю. Выключенному пункту все три
 * отказывают — `item.disabled` из кода пункта; своего `disabled` у меню нет.
 */
export class TMenuExtension<
	TOwner extends IMenuOwner<any> = IMenuOwner<any>,
	TItem extends IMenuItem = IMenuItem,
>
	extends TBaseOwnerItemExtension<
		TItem,
		IMenuItemExtension<TItem>,
		TMenuExtensionEvents,
		TMenuEngineOptions<TOwner>
	>
	implements IExtension<TItem>, IMenuExtension<TItem>
{
	readonly name = 'menu' as const

	/** Подписки на подменю коллекции: открытость и выбор в них. */
	private readonly _watched = new Map<IMenuSubmenu, () => void>()

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IMenuItemExtension<TItem>>) {
		super(TMenuItemExtension, options)
	}

	override install(ctx: IExtensionContext<TItem, TMenuEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Добавленному — только его атрибуты, размер меню и подписки: пачка
		// шлёт `item:added` на каждый пункт разом, и проход по всем на каждый из
		// них сделал бы наполнение квадратичным
		ctx.driver.events.on('item:added', (e) => {
			this._inheritOwner(e.item as TItem)
			this._applyItem(e.item as TItem)
			this._watch(e.item as TItem)
		})

		// Подписки снятого пункта уходят вместе с ним: очистка тоже шлёт
		// `item:removed` на каждый пункт
		ctx.driver.events.on('item:removed', (e) => this._unwatch(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше, — собрав её снаружи (`createEngine({ items })`). Тем пунктам
		// `item:added` уже не придёт. Отметку по выбору, сложившемуся до
		// установки, ставит тот же проход
		ctx.driver.valueOf().forEach((item) => {
			this._applyItem(item as TItem)
			this._watch(item as TItem)
		})

		// Патч пишет пункту своё из данных — размер меню поверх
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item as TItem))

		// Отметка сменилась — всем флажкам: смена выбора бывает и пачкой
		this._selection?.events.on('change:selection', () => {
			ctx.driver.valueOf().forEach((item) => this._applyChecked(item as TItem))
		})

		// Владелец — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился владелец, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Догон: пункты, лежавшие до прихода владельца
			ctx.driver.valueOf().forEach((item) => this._inheritOwner(item as TItem))

			// Размер меню — всем пунктам. Вариант у пункта свой: смена варианта
			// у меню пунктов не трогает
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((item) => this._applySize(item as TItem, owner)),
			)

			// Закрытое меню не держит открытых подменю: их панели стоят у
			// строк, которых больше не видно
			scope.on(owner.events, 'change:open', (open: boolean) => {
				if (!open) this._closeSubmenus(null)
			})
		})
	}

	/** Открытое подменю этого меню; `null` — открытого нет. */
	get opened(): IMenuSubmenu | null {
		for (const submenu of this._watched.keys()) {
			if (submenu.open) return submenu
		}

		return null
	}

	/**
	 * Нажатие пункта-действия — клик по строке или Enter и пробел на ней:
	 * строка делает из клавиш клик сама (`TActionPlugin`).
	 *
	 * Выключенный пункт не нажимается: он виден и объявляется скринридером
	 * недоступным, но нажатие ничего не делает. Проверка здесь, а не в
	 * разметке: она одна на клик и на клавиатуру. Пункт с подменю — не
	 * действие: его нажатие открывает подменю (`openItem`).
	 *
	 * Сначала меню закрывается целиком — фокус возвращается на триггер
	 * (`TMenuFocusPlugin`), — потом уходит `choose`. Обработчик, который
	 * открывает окно («Удалить…»), застаёт фокус уже на триггере, и окно,
	 * закрывшись, вернёт его туда, а не на строку спрятанной панели.
	 */
	chooseItem(item: TItem): boolean {
		if (item.disabled || isMenuSubmenu(item)) return false

		this._choose(item)

		return true
	}

	/**
	 * Нажатие флажка: переключить отметку — выбор коллекции. Меню остаётся
	 * открытым: флажков подряд бывает несколько, как в меню «Вид». Выбор,
	 * отменённый в `item:select:before`, отметку не ставит.
	 *
	 * @returns отмечен ли флажок после вызова
	 */
	toggleItem(item: TItem): boolean {
		const selection = this._selection

		if (!selection) return false

		if (item.disabled) return selection.isSelected(item)

		return selection.toggle(item)
	}

	/**
	 * Открыть подменю пункта — нажатием строки, наведением или клавишей.
	 * Открывает, а не переключает: подменю, открытое наведением, клик по
	 * строке не закроет. Прежнее открытое подменю закрывается само — на
	 * открытие нового (`_watch`).
	 *
	 * @returns открыто ли подменю после вызова
	 */
	openItem(item: TItem): boolean {
		if (!isMenuSubmenu(item) || item.disabled) return false

		item.open = true

		return item.open
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return selectionOf(this._ctx)
	}

	/**
	 * Выбор пункта — своего или пункта подменю: владелец закрывается (корень —
	 * сам, подменю — и меню над ним), потом уходит `choose`.
	 */
	private _choose(item: IMenuItem): void {
		this._ctx.options.get('owner')?.notifyChoose(item)

		this.events.emit('choose', item)
	}

	/**
	 * Следить за подменю: открылось — закрыть прежнее открытое, в нём выбрали
	 * пункт — закрыть меню и сообщить выбор выше. У остальных пунктов
	 * следить не за чем.
	 */
	private _watch(item: TItem): void {
		if (!isMenuSubmenu(item) || this._watched.has(item)) return

		const onOpen = (open: boolean): void => {
			if (open) this._closeSubmenus(item)
		}
		const onChoose = (chosen: IMenuItem): void => this._choose(chosen)

		item.events.on('change:open', onOpen)
		item.events.on('choose', onChoose)

		this._watched.set(item, () => {
			item.events.off('change:open', onOpen)
			item.events.off('choose', onChoose)
		})
	}

	private _unwatch(item: TItem): void {
		if (!isMenuSubmenu(item)) return

		this._watched.get(item)?.()
		this._watched.delete(item)
	}

	/** Закрыть открытые подменю, кроме `keep`. */
	private _closeSubmenus(keep: IMenuSubmenu | null): void {
		for (const submenu of this._watched.keys()) {
			if (submenu !== keep) submenu.open = false
		}
	}

	/** Размер меню на пункте. Владельца нет — пункт со своим. */
	private _inheritOwner(item: TItem): void {
		const owner = this._ctx.options.get('owner')

		if (owner) this._applySize(item, owner)
	}

	/** `size` пункта — всегда меню. */
	private _applySize(item: TItem, owner: TOwner): void {
		item.size = owner.size
	}

	/** Что пункт получает от меню: выход из обхода Tab и отметку флажка. */
	private _applyItem(item: TItem): void {
		item.aria.add('tabindex', '-1')

		this._applyChecked(item)
	}

	/** `aria-checked` флажка — по выбору коллекции; у действия атрибута нет. */
	private _applyChecked(item: TItem): void {
		const selection = this._selection

		if (!item.checkable || !selection) return

		item.aria.add('aria-checked', selection.isSelected(item) ? 'true' : 'false')
	}
}
