import { TValueControl } from '../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import { TAria } from '../../../common'
import type { TAriaAttributes } from '../../../common'
import type {
	ITagsProps,
	TTagsEvents,
	TTagsStates,
	ITags,
	TTagsValue,
	TTagsView,
	TTagsOverflow,
} from './types'

/** Класс панели, в которую уезжают непоместившиеся теги. */
const PANEL_CLASS = 's-tags__panel'

/**
 * Компонент Tags — коллекция тегов.
 *
 * `TValueControl`, а не `TControl`: как и у ListBox, `value` — это проекция
 * выбора коллекции, а не отдельное состояние. Связь держит
 * `TValueSelectionExtension` движка.
 *
 * В отличие от ListBox режим выбора по умолчанию `none` — у задачи нет
 * требования выделять тег, чтобы его увидеть; выбор включается явным `mode`,
 * когда он нужен (например, множественный выбор Select, отображённый тегами).
 * Дефолт `TSelectionExtension` при этом не трогаем — он переопределён только
 * в `TagsFactory`.
 *
 * Роль здесь — только то, что Tags знает о себе сам: набор тегов («list»).
 * Когда у коллекции включён выбор, роль меняется на `listbox`, а элементам —
 * на `option`; это знание коллекции, а не ядра, и пишет его `TTagsExtension`.
 *
 * Куда роль ложится, решает режим переполнения, и решает это Tags, а не тот,
 * кто роль пишет. Обычно ряд — сам корень, и набор у него один (`aria`). В
 * `arrows` ряд уезжает во вьюпорт ленты: внутри `role="listbox"` кнопкам
 * листания места нет, а между ролью и тегами оказались бы две обёртки — тогда
 * атрибуты ряда идут во второй набор, и разметка отдаёт его ленте
 * (`rowAria` → `viewportAria`).
 *
 * Поэтому атрибут ряда пишется не в набор напрямую, а через `setRowAria`:
 * место у ряда одно на всех писателей, и выбирать его в каждом было бы той же
 * строкой режима, повторённой дважды. Заодно на смене режима переезжает ровно
 * то, что объявили атрибутами ряда, — сам Tags его и переносит.
 *
 * `view` — модификатор набора (`--view-<v>`), и только он. Пилюлю тега —
 * строку вместе с кнопкой закрытия — тема рисует этим видом по классу набора,
 * а сам тег значения не получает. В отличие от ListBox вид не пробрасывается
 * в строку: крестик стоит рядом с ней, и вид строки его бы не покрыл. По
 * умолчанию вида нет — ровно как у `Button`, поэтому тег без `view` выглядит
 * кнопкой вида темы по умолчанию.
 *
 * `overflow` — что делать с тегами, которым не хватило ширины ряда. Само
 * значение уезжает в тему через `data-overflow`: раскладка ряда — её дело.
 * Знание «какие теги не поместились» ядро держит отдельно, в расширении
 * коллекции `overflow`: оно требует и владельца, и списка сразу.
 */
export class TTags
	extends TValueControl<TTagsValue, ITagsProps, TTagsEvents, TTagsStates>
	implements ITags
{
	static override baseClass = 's-tags'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<
			ITagsProps,
			'closable' | 'overflow' | 'moreLabel',
			'view' | 'prevLabel' | 'nextLabel'
		> = {
		...TValueControl.defaultValues,
		closable: false,
		view: undefined,
		overflow: 'wrap',
		// Язык интерфейса библиотеке неизвестен, а оставить кнопку без имени
		// нельзя: дефолт английский, как `closeLabel` у тега
		moreLabel: 'More',
		// А у кнопок листания дефолт держит лента: они её, и второй экземпляр
		// тех же английских слов однажды разошёлся бы с первым. Ключ всё равно
		// объявлен — им снятый пропом `undefined` возвращает ленту к своему
		// (AGENTS.md, «Умолчание пропа — в декларации»)
		prevLabel: undefined,
		nextLabel: undefined,
	}

	protected _closable!: boolean
	protected _view: TTagsView | undefined
	protected _overflow!: TTagsOverflow
	protected _moreLabel!: string
	protected _prevLabel: string | undefined
	protected _nextLabel: string | undefined
	protected _rowAria: TAria

	/**
	 * Имена атрибутов, объявленных свойствами ряда, а не корня.
	 *
	 * Список не зашит: его набирает `setRowAria` — кто пишет, тот и объявляет.
	 * Нужен он ровно для переезда: ряд меняет место вместе с режимом, и
	 * унести с собой он обязан всё своё, ничего не зная о ролях и ориентациях.
	 */
	private readonly _rowNames = new Set<string>()

	constructor(props: Partial<ITagsProps> = {}, options: IComponentOptions<TTagsStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTags

		this._closable = props.closable ?? ctor.defaultValues.closable
		this._moreLabel = props.moreLabel ?? ctor.defaultValues.moreLabel
		this._prevLabel = props.prevLabel ?? ctor.defaultValues.prevLabel
		this._nextLabel = props.nextLabel ?? ctor.defaultValues.nextLabel

		this._rowAria = new TAria()

		this._rowAria.events.on('change', () =>
			this.events.emit('change:rowAria', this._rowAria.toObject()),
		)

		this._applyView(props.view ?? ctor.defaultValues.view)
		this._applyOverflow(props.overflow ?? ctor.defaultValues.overflow)

		this.setRowAria('role', 'list')
	}

	get closable(): boolean {
		return this._closable
	}

	set closable(value: boolean) {
		if (this._closable === value) return

		this._closable = value
		this.events.emit('change:closable', value)
	}

	get view(): TTagsView | undefined {
		return this._view
	}

	set view(value: TTagsView | undefined) {
		if (this._view === value) return

		this._applyView(value, this._view)
		this.events.emit('change:view', value)
	}

	get overflow(): TTagsOverflow {
		return this._overflow
	}

	set overflow(value: TTagsOverflow) {
		if (this._overflow === value) return

		this._applyOverflow(value)
		this.events.emit('change:overflow', value)
	}

	/** Имя кнопки «…» — той, что открывает панель с непоместившимися тегами. */
	get moreLabel(): string {
		return this._moreLabel
	}

	set moreLabel(value: string) {
		if (this._moreLabel === value) return

		this._moreLabel = value
		this.events.emit('change:moreLabel', value)
	}

	/**
	 * Имена кнопок листания — сквозь Tags в ленту.
	 *
	 * Своего умолчания здесь нет намеренно: кнопки принадлежат ленте, дефолты
	 * держит она, и вторая копия тех же английских строк однажды разошлась бы
	 * с первой. `undefined` — «не задавали»: лента остаётся при своём.
	 *
	 * Пропом, а не значением из `aria`: языка интерфейса библиотека не знает
	 * (AGENTS.md, «Языка интерфейса библиотека не знает») — ровно та же
	 * причина, по которой у Tags есть `moreLabel`.
	 */
	get prevLabel(): string | undefined {
		return this._prevLabel
	}

	set prevLabel(value: string | undefined) {
		if (this._prevLabel === value) return

		this._prevLabel = value
		this.events.emit('change:prevLabel', value)
	}

	get nextLabel(): string | undefined {
		return this._nextLabel
	}

	set nextLabel(value: string | undefined) {
		if (this._nextLabel === value) return

		this._nextLabel = value
		this.events.emit('change:nextLabel', value)
	}

	/**
	 * Ряд завёрнут в ленту со стрелками.
	 *
	 * Признаком, а не сравнением строки в разметке: иначе `overflow ===
	 * 'arrows'` повторилось бы в шести адаптерах, и в шести же местах его
	 * пришлось бы править.
	 */
	get arrows(): boolean {
		return this._overflow === 'arrows'
	}

	/**
	 * Атрибуты ряда, когда рядом стал вьюпорт ленты, — снимком, как `moreAria`
	 * и `panelAria`: за границу core → ui уходит значение, а не живой набор.
	 *
	 * Вне `arrows` он пуст: ряд там — сам корень, и всё это стоит на нём.
	 */
	get rowAria(): TAriaAttributes {
		return this._rowAria.toObject()
	}

	/**
	 * Записать атрибут ряда — роль набора, ориентацию, множественность выбора.
	 *
	 * Метод, а не набор наружу: место у ряда зависит от режима, и выбирать его
	 * должен один — иначе строка `overflow === 'arrows'` расходится по всем,
	 * кто пишет. Имя заодно попадает в список того, что при смене режима
	 * переезжает вместе с рядом.
	 *
	 * `null` снимает атрибут — как у `TAria.add`, чтобы не ветвиться на каждом
	 * вызове.
	 */
	setRowAria(name: string, value: string | null): void {
		this._rowNames.add(name)
		this._rowSet.add(name, value)
	}

	/**
	 * Имя кнопки «…».
	 *
	 * Значением, а не набором `aria`: кнопка — содержимое слота `trigger` у
	 * панели, своего экземпляра у неё нет, писать некуда (см. AGENTS.md,
	 * «Часть или слот»). Тот же приём, что у `triggerAria` Popover.
	 */
	get moreAria(): TAriaAttributes {
		return { 'aria-label': this._moreLabel }
	}

	/**
	 * Классы панели — классы ряда плюс свой класс места.
	 *
	 * Теги панели телепортированы и потомками корня не являются, поэтому
	 * селекторы вида (`.s-tags--view-<v> > .s-tags-item`) до них не достают.
	 * Отдаёт это ядро, а не вычисляет шаблон: иначе одно и то же пришлось бы
	 * повторить в шести адаптерах.
	 */
	get panelClasses(): string[] {
		return [...this._classes.valueOf(), PANEL_CLASS]
	}

	/**
	 * ARIA панели: роль повторяет роль ряда — `list` без выбора, `listbox` с
	 * ним. Роль знает коллекция (`TTagsExtension`), и читается она из того же
	 * набора, в который расширение её пишет, а не считается второй раз.
	 *
	 * Набор этот зависит от режима, поэтому и здесь спрашивается `_rowSet`, а
	 * не `aria` напрямую. Панель бывает только в `popover`, то есть это всегда
	 * корень, — но второе место, где написано «роль лежит там-то», однажды
	 * разошлось бы с первым.
	 */
	get panelAria(): TAriaAttributes {
		return { role: this._rowSet.get('role') ?? null }
	}

	/**
	 * Набор, который описывает ряд тегов: обычно корень, в `arrows` — вьюпорт
	 * ленты. Единственное место, где это решается.
	 */
	protected get _rowSet(): TAria {
		return this.arrows ? this._rowAria : this._aria
	}

	/** Модификатор вида — с префиксом `--view-`; `swap` пропускает пустое значение. */
	protected _applyView(newValue: TTagsView | undefined, oldValue?: TTagsView): void {
		this._classes.swap({
			prefix: '--view-',
			oldValue,
			newValue,
		})

		this._view = newValue
	}

	/** Режим переполнения — состояние для темы, поэтому `data-*`, а не класс. */
	protected _applyOverflow(value: TTagsOverflow): void {
		const previous = this._rowSet

		this._overflow = value

		this._dataset.add('overflow', value)
		this._moveRowAria(previous)
	}

	/**
	 * Ряд сменил место — атрибуты ряда переезжают вместе с ним.
	 *
	 * Иначе в корне осталась бы роль, которую он больше не описывает: у
	 * скринридера вышло бы два вложенных листбокса, внешний — пустой.
	 */
	private _moveRowAria(previous: TAria): void {
		const current = this._rowSet

		if (current === previous) return

		for (const name of this._rowNames) {
			current.add(name, previous.get(name) ?? null)
			previous.remove(name)
		}
	}

	override getProps(): ITagsProps {
		return {
			...super.getProps(),
			closable: this._closable,
			view: this._view,
			overflow: this._overflow,
			moreLabel: this._moreLabel,
			prevLabel: this._prevLabel,
			nextLabel: this._nextLabel,
		} as ITagsProps
	}
}
