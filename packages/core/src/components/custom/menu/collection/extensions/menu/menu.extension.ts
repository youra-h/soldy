import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TBaseOwnerItemExtension, selectionOf } from '../../../../../base/collection'
import type { IMenuItem } from '../../../item/types'
import type { IMenuOwner } from '../../../types'
import type {
	IMenuPopupItem,
	IMenuPopupItemProps,
	TMenuPopupItemEvents,
} from '../../../popup-item/types'
import { isMenuPopupItem } from '../../../popup-item/popup-item.class'
import { isMenuSubmenu } from '../../../submenu/submenu.class'
import { isMenuRadioItem } from '../../../radio-item/radio-item.class'
import type { IMenuRadioItem } from '../../../radio-item/types'
import type { IMenuRadioGroup, TMenuRadioGroupValue } from '../../../radio-group/types'
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
 * Пять обязанностей:
 *
 * 1. **Остановка Tab.** У меню её нет вовсе: в меню ведут кнопка и клавиши, а
 *    Tab закрывает его (APG Menu Button). Поэтому каждому пункту —
 *    `tabindex="-1"`: строка держит фокус, когда на ней подсветка, но в обход
 *    Tab не входит. Своего `tabindex` у строки пункта нет (`TItemRow`), и
 *    этот — единственный. Пишет коллекция, а не плагин: атрибут обязан
 *    стоять с первой отрисовки, включая серверную.
 * 2. **Отметка флажков и переключателей.** Отметка — выбор коллекции (режим
 *    `multiple`), и `aria-checked` пункту пишет меню: что пункт отмечается,
 *    знает пункт (`checkable`), а отмечен ли — коллекция. Всем отмечаемым, а
 *    не только отмеченным: скринридер объявляет «не отмечено», и для этого
 *    нужен атрибут. У действия `aria-checked` нет.
 * 3. **Размер** пункта диктует меню, как у `TListBoxExtension`. **Вариант** у
 *    пункта свой, как у тега (`docs/agents/collections.md`, «`size` и
 *    `variant` элемента»): «опасный» пункт вроде «Удалить» красится своим
 *    цветом. Вариант меню пункту не пишется вовсе: пункт без своего тема
 *    красит вариантом меню — с класса панели (`so-menu__panel--variant-<v>`),
 *    а свой модификатор пункта сильнее. Писать вариант меню пункту «если
 *    своего нет» значило бы завести второй путь: в одном поле не различить,
 *    задал ли его потребитель или записало меню. Подменю среди пунктов —
 *    отдельный вход, `menuVariant`: вариант панели меню (`panelVariant`), как
 *    размер, — при добавлении, поверх патча и на смену у меню. Панель подменю
 *    телепортирована, и класс панели меню до её пунктов не доходит, поэтому
 *    она красится сама: своим вариантом подменю, а без него — этим.
 * 4. **Панели пунктов** — у пунктов со своей панелью (`isMenuPopupItem`):
 *    подменю и пункта с панелью. Открыта одна: открывшаяся закрывает
 *    прежнюю, — у меню одна панель сбоку, какого бы вида ни был пункт, — а
 *    закрывшееся меню закрывает открытую (подменю — и свои, до самого нижнего
 *    уровня). Выбор в подменю доходит сюда событием подменю (`choose`) и
 *    закрывает это меню так же, как выбор своего пункта: подменю — ещё и
 *    владелец своих пунктов.
 * 5. **Группы переключателей** (`Menu.RadioGroup`). Отметка переключателя —
 *    тот же выбор `multiple`, что у флажка, а правило «в группе отмечен один»
 *    держит меню: стал отмеченным переключатель — с остальных переключателей
 *    его группы отметка снята. Значение группы (`value`) — проекция отметки,
 *    и связь в обе стороны тоже здесь: отметили переключатель — группе
 *    записано его значение, сняли с оставшегося в коллекции — `null`;
 *    сменилось значение группы — отмечен её переключатель с этим значением,
 *    нет такого — ни один. Пришёл в коллекцию переключатель со значением
 *    группы — отмечен. Ушедший отмеченный значения не трогает: он мог уйти на
 *    время. Отметку, отменённую в `item:select:before`, значение не меняет —
 *    оно откатывается к отмеченному переключателю. Своей коллекции у группы
 *    нет: её пункты выпали бы из навигации меню. Чья группа, переключатель
 *    знает сам (`group`), а подписка на группу живёт, пока в коллекции есть её
 *    переключатель.
 *
 * Через него идёт нажатие пункта: `chooseItem` у действия, `toggleItem` у
 * флажка, `checkItem` у переключателя, `openItem` у пункта со своей панелью.
 * Выключенному пункту все отказывают — `item.disabled` из кода пункта;
 * своего `disabled` у меню нет.
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

	/**
	 * Подписки на пункты со своей панелью: открытость панели, а у подменю —
	 * ещё и выбор в нём.
	 */
	private readonly _watched = new Map<
		IMenuPopupItem<IMenuPopupItemProps, TMenuPopupItemEvents>,
		() => void
	>()

	/** Переключатели коллекции и подписки на смену их группы. */
	private readonly _radios = new Map<TItem & IMenuRadioItem, () => void>()

	/**
	 * Подписки на группы переключателей: смена значения группы. Есть у каждой
	 * группы, чей переключатель в коллекции, — ставится с приходом
	 * переключателя, снимается на смене состава, когда ни одного не осталось.
	 */
	private readonly _groups = new Map<IMenuRadioGroup, () => void>()

	/**
	 * Идёт синхронизация значения групп и отметки переключателей. Флаг, а не
	 * сравнение: то, что пишет сама синхронизация, — не смена, на которую ей
	 * отвечать.
	 */
	private _syncing = false

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IMenuItemExtension<TItem>>) {
		super(TMenuItemExtension, options)
	}

	override install(ctx: IExtensionContext<TItem, TMenuEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Добавленному — только его атрибуты, то, что он получает от меню, и
		// подписки: пачка шлёт `item:added` на каждый пункт разом, и проход по
		// всем на каждый из них сделал бы наполнение квадратичным.
		// Переключатель со значением группы отмечается здесь же — он один на
		// группу
		ctx.driver.events.on('item:added', (e) => {
			this._inheritOwner(e.item as TItem)
			this._applyItem(e.item as TItem)
			this._watch(e.item as TItem)
			this._watchRadio(e.item as TItem)
		})

		// Подписки снятого пункта уходят вместе с ним: очистка тоже шлёт
		// `item:removed` на каждый пункт
		ctx.driver.events.on('item:removed', (e) => {
			this._unwatch(e.item as TItem)
			this._unwatchRadio(e.item as TItem)
		})

		// Подписки на группы — по составу, раз на запись: `change:items`
		// приходит следом за всеми `item:*` команды и пачки
		ctx.driver.events.on('change:items', () => this._releaseGroups())

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше, — собрав её снаружи (`createEngine({ items })`). Тем пунктам
		// `item:added` уже не придёт. Отметку по выбору, сложившемуся до
		// установки, ставит тот же проход
		ctx.driver.valueOf().forEach((item) => {
			this._applyItem(item as TItem)
			this._watch(item as TItem)
			this._watchRadio(item as TItem)
		})

		// Отметки, которые выбор сложил до установки, — значениям групп
		this._selectionToValues()

		// Патч пишет пункту своё из данных — то, что пункт получает от меню,
		// поверх
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item as TItem))

		// Отметка сменилась — всем отмечаемым: смена выбора бывает и пачкой.
		// Значения групп — за отметкой
		this._selection?.events.on('change:selection', () => {
			ctx.driver.valueOf().forEach((item) => this._applyChecked(item as TItem))

			this._selectionToValues()
		})

		// Владелец — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился владелец, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Догон: пункты, лежавшие до прихода владельца
			ctx.driver.valueOf().forEach((item) => this._inheritOwner(item as TItem))

			// Размер меню — всем пунктам. Вариант у пункта свой: смена варианта
			// у меню пунктов не трогает, а подменю среди них получают вариант
			// панели меню своим входом
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((item) => this._applySize(item as TItem, owner)),
			)
			scope.on(owner.events, 'change:panelVariant', () =>
				ctx.driver
					.valueOf()
					.forEach((item) => this._applyMenuVariant(item as TItem, owner)),
			)

			// Закрытое меню не держит открытых панелей пунктов: они стоят у
			// строк, которых больше не видно
			scope.on(owner.events, 'change:open', (open: boolean) => {
				if (!open) this._closePanels(null)
			})
		})
	}

	/** Пункт этого меню с открытой панелью — подменю или пункт с панелью; `null` — такого нет. */
	get opened(): IMenuPopupItem | null {
		for (const item of this._watched.keys()) {
			if (item.open) return item
		}

		return null
	}

	/**
	 * Нажатие пункта-действия — клик по строке или Enter и пробел на ней:
	 * строка делает из клавиш клик сама (`TActionPlugin`).
	 *
	 * Выключенный пункт не нажимается: он виден и объявляется скринридером
	 * недоступным, но нажатие ничего не делает. Проверка здесь, а не в
	 * разметке: она одна на клик и на клавиатуру. Пункт со своей панелью — не
	 * действие: его нажатие открывает панель (`openItem`).
	 *
	 * Сначала меню закрывается целиком — фокус возвращается на триггер
	 * (`TMenuFocusPlugin`), — потом уходит `choose`. Обработчик, который
	 * открывает окно («Удалить…»), застаёт фокус уже на триггере, и окно,
	 * закрывшись, вернёт его туда, а не на строку спрятанной панели.
	 */
	chooseItem(item: TItem): boolean {
		if (item.disabled || isMenuPopupItem(item)) return false

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
	 * Нажатие переключателя: отметить его — выбор коллекции. Меню остаётся
	 * открытым, как у флажка. Отмечает, а не переключает: в группе отмечен
	 * один, и снять отметку, не отметив другой, нажатием нельзя. С остальных
	 * переключателей группы отметку снимает и значение группе пишет сверка
	 * отметки со значением (`change:selection`): путь у нажатия и у отметки
	 * из кода один. Выбор, отменённый в `item:select:before`, отметку не
	 * ставит.
	 *
	 * @returns отмечен ли переключатель после вызова
	 */
	checkItem(item: TItem): boolean {
		const selection = this._selection

		if (!selection) return false

		if (!item.disabled) selection.select(item)

		return selection.isSelected(item)
	}

	/**
	 * Открыть панель пункта — подменю или панель пункта с панелью — нажатием
	 * строки, наведением или клавишей. Открывает, а не переключает: панель,
	 * открытая наведением, клик по строке не закроет. Прежняя открытая панель
	 * закрывается сама — на открытие новой (`_watch`).
	 *
	 * @returns открыта ли панель после вызова
	 */
	openItem(item: TItem): boolean {
		if (!isMenuPopupItem(item) || item.disabled) return false

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
	 * Следить за пунктом со своей панелью: открылась его панель — закрыть
	 * прежнюю открытую. Подменю — ещё и владелец своих пунктов: в нём выбрали
	 * пункт — закрыть меню и сообщить выбор выше. У остальных пунктов следить
	 * не за чем.
	 */
	private _watch(item: TItem): void {
		if (!isMenuPopupItem(item) || this._watched.has(item)) return

		const onOpen = (open: boolean): void => {
			if (open) this._closePanels(item)
		}
		const offs = [(): void => item.events.off('change:open', onOpen)]

		item.events.on('change:open', onOpen)

		if (isMenuSubmenu(item)) {
			const onChoose = (chosen: IMenuItem): void => this._choose(chosen)

			item.events.on('choose', onChoose)
			offs.push(() => item.events.off('choose', onChoose))
		}

		this._watched.set(item, () => offs.forEach((off) => off()))
	}

	private _unwatch(item: TItem): void {
		if (!isMenuPopupItem(item)) return

		this._watched.get(item)?.()
		this._watched.delete(item)
	}

	/** Закрыть открытые панели пунктов, кроме панели `keep`. */
	private _closePanels(keep: IMenuPopupItem | null): void {
		for (const item of this._watched.keys()) {
			if (item !== keep) item.open = false
		}
	}

	/**
	 * Переключатель пришёл в коллекцию: следить за сменой его группы и за
	 * значением группы. Значение группы — его: он отмечен.
	 *
	 * Переключатель, перешедший в другую группу, — как пришедший в неё: её
	 * значение — его, и он отмечен, а отмеченный — новый в ней, и значение
	 * группы за ним. Прежняя группа значения не меняет, как от ушедшего.
	 */
	private _watchRadio(item: TItem): void {
		if (!isMenuRadioItem(item) || this._radios.has(item)) return

		const onGroup = (): void => {
			this._followGroup(item.group)
			this._releaseGroups()
			this._checkByValue(item)
			this._selectionToValues()
		}

		item.events.on('change:group', onGroup)
		this._radios.set(item, () => item.events.off('change:group', onGroup))

		this._followGroup(item.group)
		this._checkByValue(item)
	}

	private _unwatchRadio(item: TItem): void {
		if (!isMenuRadioItem(item)) return

		this._radios.get(item)?.()
		this._radios.delete(item)
	}

	/** Следить за значением группы, если ещё не следим. */
	private _followGroup(group: IMenuRadioGroup | null): void {
		if (!group || this._groups.has(group)) return

		const onValue = (): void => this._valueToSelection(group)

		group.events.on('change:value', onValue)
		this._groups.set(group, () => group.events.off('change:value', onValue))
	}

	/** Перестать следить за группами, у которых в коллекции не осталось переключателя. */
	private _releaseGroups(): void {
		if (this._groups.size === 0) return

		const present = this._radiosByGroup()

		for (const [group, off] of this._groups) {
			if (present.has(group)) continue

			off()
			this._groups.delete(group)
		}
	}

	/** Переключатели коллекции по группам; переключатели вне группы не в счёт. */
	private _radiosByGroup(): Map<IMenuRadioGroup, Array<TItem & IMenuRadioItem>> {
		const groups = new Map<IMenuRadioGroup, Array<TItem & IMenuRadioItem>>()

		for (const radio of this._radios.keys()) {
			if (radio.group) groups.set(radio.group, [...(groups.get(radio.group) ?? []), radio])
		}

		return groups
	}

	/** Отмеченные переключатели группы — в порядке выбора. */
	private _checkedOf(group: IMenuRadioGroup): Array<TItem & IMenuRadioItem> {
		return (this._selection?.selected ?? []).filter(
			(item): item is TItem & IMenuRadioItem => isMenuRadioItem(item) && item.group === group,
		)
	}

	/** Значение группы — значение переключателя: отметить его в группе. */
	private _checkByValue(radio: TItem & IMenuRadioItem): void {
		const group = radio.group

		if (!group || group.value === null || radio.value !== group.value) return

		this._settle(group, radio)
	}

	/**
	 * Значение группы сменилось: отметить её переключатель с этим значением,
	 * нет такого — ни один. Значение без переключателя остаётся: переключатель
	 * мог ещё не прийти, и отметит его приход.
	 */
	private _valueToSelection(group: IMenuRadioGroup): void {
		if (this._syncing) return

		const { value } = group
		const target =
			value === null
				? undefined
				: this._radiosByGroup()
						.get(group)
						?.find((radio) => radio.value === value)

		this._settle(group, target)
	}

	/**
	 * Отметить в группе `target` — нет его, ни один — и снять отметку с
	 * остальных её переключателей.
	 *
	 * Отметку, отменённую в `item:select:before`, значение не меняет: прежняя
	 * отметка остаётся, а значение откатывается к ней — нет её, к `null`.
	 */
	private _settle(group: IMenuRadioGroup, target: (TItem & IMenuRadioItem) | undefined): void {
		const selection = this._selection

		if (!selection) return

		const others = this._checkedOf(group).filter((radio) => radio !== target)
		let rejected = false

		this._sync(() => {
			if (target && !selection.select(target)) {
				rejected = true

				return
			}

			if (others.length > 0) selection.deselectMany(others)
		})

		if (!rejected) return

		this._sync(() => {
			group.value = others.at(-1)?.value ?? null
		})
	}

	/**
	 * Отметка сменилась — значения групп за ней.
	 *
	 * Пока синхронизация не идёт, отмеченный переключатель группы один и несёт
	 * её значение. Поэтому новый в группе — отмеченный не со значением группы:
	 * он и остаётся отмеченным, с остальных отметка снимается, а группе
	 * пишется его значение. Нового нет, а отмеченных несколько — у них одно
	 * значение, — остаётся последний отмеченный.
	 *
	 * В группе не отмечен ни один, а переключатель с её значением в коллекции
	 * — отметку с него сняли, и значение группы — `null`. Такого нет — значение
	 * ждёт: отмеченный мог уйти из коллекции на время, а нужный — ещё не
	 * прийти.
	 */
	private _selectionToValues(): void {
		const selection = this._selection

		if (!selection || this._syncing || this._radios.size === 0) return

		const checked = new Map<IMenuRadioGroup, Array<TItem & IMenuRadioItem>>()

		for (const item of selection.selected) {
			if (isMenuRadioItem(item) && item.group) {
				checked.set(item.group, [...(checked.get(item.group) ?? []), item])
			}
		}

		const surplus: Array<TItem & IMenuRadioItem> = []
		const values: Array<[IMenuRadioGroup, TMenuRadioGroupValue]> = []

		for (const [group, radios] of checked) {
			const kept =
				radios.filter((radio) => radio.value !== group.value).at(-1) ??
				radios[radios.length - 1]

			surplus.push(...radios.filter((radio) => radio !== kept))

			if (kept.value !== group.value) values.push([group, kept.value])
		}

		for (const [group, radios] of this._radiosByGroup()) {
			const { value } = group

			if (checked.has(group) || value === null) continue

			if (radios.some((radio) => radio.value === value)) values.push([group, null])
		}

		if (surplus.length === 0 && values.length === 0) return

		this._sync(() => {
			if (surplus.length > 0) selection.deselectMany(surplus)

			for (const [group, value] of values) group.value = value
		})
	}

	/**
	 * Записать то, что решила синхронизация, не отвечая на свои же записи:
	 * смена выбора и значения, которую она делает сама, — не повод сверять
	 * снова.
	 */
	private _sync(write: () => void): void {
		const syncing = this._syncing

		this._syncing = true

		try {
			write()
		} finally {
			this._syncing = syncing
		}
	}

	/**
	 * Размер меню на пункте, а у подменю — ещё и вариант панели меню. Владельца
	 * нет — пункт со своими.
	 */
	private _inheritOwner(item: TItem): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applySize(item, owner)
		this._applyMenuVariant(item, owner)
	}

	/** `size` пункта — всегда меню. */
	private _applySize(item: TItem, owner: TOwner): void {
		item.size = owner.size
	}

	/**
	 * `menuVariant` подменю — вариант панели меню. Свой `variant` подменю не
	 * трогается: панель решает сама, чей вариант сильнее.
	 */
	private _applyMenuVariant(item: TItem, owner: TOwner): void {
		if (isMenuSubmenu(item)) item.menuVariant = owner.panelVariant
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
