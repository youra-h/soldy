import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IMenuItem } from '../../../item/types'
import type { IMenu } from '../../../types'
import type { IMenuExtension, TMenuEngineOptions, TMenuExtensionEvents } from './types'
import { TMenuItemExtension, type IMenuItemExtension } from './item'

/**
 * TMenuExtension — то, что пункт знает благодаря меню.
 *
 * Владелец — опция движка (`owner`): он приходит и уходит после сборки, и
 * расширение наблюдает его (`ctx.options.watch`).
 *
 * Три обязанности:
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
 *
 * Через него идёт нажатие пункта: `chooseItem` у действия, `toggleItem` у
 * флажка. Выключенному пункту оба отказывают — `item.disabled` из кода
 * пункта; своего `disabled` у меню нет.
 */
export class TMenuExtension<TOwner extends IMenu = IMenu, TItem extends IMenuItem = IMenuItem>
	extends TBaseOwnerItemExtension<
		TItem,
		IMenuItemExtension<TItem>,
		TMenuExtensionEvents,
		TMenuEngineOptions<TOwner>
	>
	implements IExtension<TItem>, IMenuExtension<TItem>
{
	readonly name = 'menu' as const

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IMenuItemExtension<TItem>>) {
		super(TMenuItemExtension, options)
	}

	override install(ctx: IExtensionContext<TItem, TMenuEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Добавленному — только его атрибуты и размер меню: пачка шлёт
		// `item:added` на каждый пункт разом, и проход по всем на каждый из них
		// сделал бы наполнение квадратичным
		ctx.driver.events.on('item:added', (e) => {
			this._inheritOwner(e.item as TItem)
			this._applyItem(e.item as TItem)
		})

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше, — собрав её снаружи (`createEngine({ items })`). Тем пунктам
		// `item:added` уже не придёт. Отметку по выбору, сложившемуся до
		// установки, ставит тот же проход
		ctx.driver.valueOf().forEach((item) => this._applyItem(item as TItem))

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
		})
	}

	/**
	 * Нажатие пункта-действия — клик по строке или Enter и пробел на ней:
	 * строка делает из клавиш клик сама (`TActionPlugin`).
	 *
	 * Выключенный пункт не нажимается: он виден и объявляется скринридером
	 * недоступным, но нажатие ничего не делает. Проверка здесь, а не в
	 * разметке: она одна на клик и на клавиатуру.
	 *
	 * Сначала меню закрывается — фокус возвращается на триггер (`TMenuFocusPlugin`), —
	 * потом уходит `choose`. Обработчик, который открывает окно («Удалить…»),
	 * застаёт фокус уже на триггере, и окно, закрывшись, вернёт его туда, а не
	 * на строку спрятанной панели.
	 */
	chooseItem(item: TItem): boolean {
		if (item.disabled) return false

		const owner = this._ctx.options.get('owner')

		if (owner) owner.open = false

		this.events.emit('choose', item)

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

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as ISelectionExtension<TItem> | undefined
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
