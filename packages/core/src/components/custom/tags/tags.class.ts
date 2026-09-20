import { TValueControl } from '../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
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
 * `_aria.role` здесь — только то, что Tags знает о себе сам: набор тегов
 * («list»). Когда у коллекции включён выбор, роль меняется на `listbox`, а
 * элементам — на `option`; это знание коллекции, а не ядра, и пишет его
 * `TTagsExtension`.
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
		TDefaultValues<ITagsProps, 'closable' | 'overflow' | 'moreLabel', 'view'> = {
		...TValueControl.defaultValues,
		closable: false,
		view: undefined,
		overflow: 'wrap',
		// Язык интерфейса библиотеке неизвестен, а оставить кнопку без имени
		// нельзя: дефолт английский, как `closeLabel` у тега
		moreLabel: 'More',
	}

	protected _closable!: boolean
	protected _view: TTagsView | undefined
	protected _overflow!: TTagsOverflow
	protected _moreLabel!: string

	constructor(props: Partial<ITagsProps> = {}, options: IComponentOptions<TTagsStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTags

		this._closable = props.closable ?? ctor.defaultValues.closable
		this._moreLabel = props.moreLabel ?? ctor.defaultValues.moreLabel

		this._applyView(props.view ?? ctor.defaultValues.view)
		this._applyOverflow(props.overflow ?? ctor.defaultValues.overflow)

		this._aria.add('role', 'list')
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
	 */
	get panelAria(): TAriaAttributes {
		return { role: this._aria.get('role') ?? null }
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
		this._overflow = value

		this._dataset.add('overflow', value)
	}

	override getProps(): ITagsProps {
		return {
			...super.getProps(),
			closable: this._closable,
			view: this._view,
			overflow: this._overflow,
			moreLabel: this._moreLabel,
		} as ITagsProps
	}
}
