import { TBaseExtension } from '../../../../../base/collection'
import type {
	IExtension,
	IExtensionContext,
	TBatchExtension,
	TOrderExtension,
} from '../../../../../base/collection'
import { TPopover } from '../../../../popover'
import type { IPopover } from '../../../../popover'
import type { ITags } from '../../../types'
import type { ITagsItem } from '../../../item/types'
import type {
	ITagsOverflowExtension,
	ITagsOverflowExtensionOptions,
	TTagsOverflowExtensionEvents,
} from './types'

/**
 * TTagsOverflowExtension — что делать с тегами, которым не хватило ширины ряда.
 *
 * Расширение, а не пятая обязанность `TTagsExtension`: состав ряда и состав
 * панели — это знание о коллекции целиком, и оно нужно вместе с владельцем
 * (режим он держит) и списком (кого делить).
 *
 * Делит показанное на две части: `fitted` рисует ряд, `overflowed` — панель.
 * **Каждый тег отрисован ровно один раз** — вторая отрисовка того же элемента
 * перетёрла бы его запись в реестре bundles (ключ там `uid`), и плагины
 * пошли бы работать с чужим узлом.
 *
 * Сколько тегов помещается, знает только DOM, поэтому считает это плагин
 * замера и сообщает сюда (`notifyFit`) — тем же приёмом, что `notifyFocus` у
 * клавиатуры. Вне `popover` делить нечего: ряд переносит теги сам (`wrap`)
 * или прокручивает (`scroll`), и всё показанное лежит в `fitted`.
 *
 * Панель — готовый `TPopover`, и создаёт его расширение, а не разметка. Тогда
 * «закрыли из панели последний тег → панель закрылась» решается в ядре, один
 * раз на шесть адаптеров, а не привязкой в шаблоне каждого.
 */
export class TTagsOverflowExtension<
	TOwner extends ITags = ITags,
	TItem extends ITagsItem = ITagsItem,
>
	extends TBaseExtension<TItem, TTagsOverflowExtensionEvents>
	implements IExtension<TItem>, ITagsOverflowExtension<TItem>
{
	readonly name = 'overflow' as const

	private readonly _owner: TOwner
	private _panel: IPopover | null = null

	/**
	 * Сколько первых показанных тегов помещается в ряд.
	 *
	 * Стартовое значение — `Infinity`, «помещаются все»: до первого замера
	 * теги обязаны стоять в ряду, иначе их не измерить.
	 */
	private _fit = Number.POSITIVE_INFINITY

	constructor(options: ITagsOverflowExtensionOptions<TOwner>) {
		super()

		this._owner = options.owner
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		this._owner.events.on('change:overflow', () => this._syncMode())

		// Состав сменился — делить надо заново. `change:shown` приходит и на
		// смену состава, и на устаревшую выборку — ровно то, что рисует ряд
		this._batch?.events.on('change:shown', () => this._sync())

		this._syncMode()
	}

	/** Теги ряда: вне `popover` — всё показанное. */
	get fitted(): TItem[] {
		const shown = this._shown

		return this._panel ? shown.slice(0, this._fit) : shown
	}

	/** Теги панели: вне `popover` — пусто, панели нет. */
	get overflowed(): TItem[] {
		return this._panel ? this._shown.slice(this._fit) : []
	}

	/** Инстанс панели, пока режим `popover`; иначе `null`. */
	get panel(): IPopover | null {
		return this._panel
	}

	/**
	 * Место кнопки «…» в ряду — номер первого не поместившегося тега.
	 *
	 * Свой номер в коллекции тег несёт стилем (`order` у ряда-флексбокса):
	 * порядок элементов — знание коллекции, и перестановка не должна
	 * переписывать разметку. Кнопка элементом коллекции не является, и без
	 * своего номера она встаёт нулевой — то есть сразу за первым тегом, а не
	 * в конец ряда. Её место — место первого тега, который не поместился: он
	 * и весь хвост за ним уехали в панель.
	 *
	 * Без хвоста — `0`: кнопки в ряду нет, и ставить нечего.
	 */
	get moreOrder(): number {
		const [first] = this.overflowed

		return first ? (this._order?.getItemOrder(first) ?? 0) : 0
	}

	/**
	 * Результат замера: сколько первых показанных тегов помещается в ряд.
	 *
	 * Замер идёт без обратной связи — тег в `popover` не сжимается, ширина у
	 * него одна и та же в ряду и в панели, — поэтому здесь только память
	 * числа и пересчёт состава.
	 */
	notifyFit(count: number): void {
		const fit = Math.max(0, count)

		if (fit === this._fit) return

		this._fit = fit
		this._sync()
	}

	private get _batch(): TBatchExtension<TItem> | undefined {
		return this._ctx?.extensions.batch as TBatchExtension<TItem> | undefined
	}

	private get _order(): TOrderExtension<TItem> | undefined {
		return this._ctx?.extensions.order as TOrderExtension<TItem> | undefined
	}

	/** То, что рисует ряд, — состав после отбора, как в разметке. */
	private get _shown(): TItem[] {
		return [...(this._batch?.shown ?? [])]
	}

	/** Панель живёт, только пока режим `popover`. */
	private _syncMode(): void {
		const needed = this._owner.overflow === 'popover'

		if (needed === (this._panel !== null)) return

		// Свежий режим — свежий замер: прежнее число считали в другой раскладке
		this._fit = Number.POSITIVE_INFINITY
		this._panel = needed ? this._createPanel() : null

		this.events.emit('change:panel', this._panel)
		this.events.emit('change:fit')
	}

	/**
	 * Панель без кнопки закрытия: закрывают её нажатие мимо, Escape и
	 * повторное нажатие на «…». Крестик в углу панели с парой тегов — шум.
	 */
	private _createPanel(): IPopover {
		return new TPopover({ closable: false })
	}

	/**
	 * Состав изменился — перечитать деление и закрыть опустевшую панель.
	 *
	 * Закрытие здесь, а не в разметке: тег закрывают из самой панели, и
	 * последний закрытый оставил бы её пустой висеть над страницей.
	 */
	private _sync(): void {
		if (this._panel && this.overflowed.length === 0) this._panel.open = false

		this.events.emit('change:fit')
	}
}
