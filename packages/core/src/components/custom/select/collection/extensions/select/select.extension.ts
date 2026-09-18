import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBatchExtension,
	IExtension,
	IExtensionContext,
	IFilterExtension,
	ISelectionExtension,
} from '../../../../../base/collection'
import { bindDisabledToOwner, notifyOwnerDisabled } from '../../../../../base/control'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import { LIST_CONTENT_FIT_ATTRIBUTE, LIST_INDICATOR_ATTRIBUTE } from '../../../../list'
import type { TListIndicator } from '../../../../list'
import type { ISelect } from '../../../types'
import type { ISelectItem } from '../../../item/types'
import type { TSelectTagsExtension } from '../tags'
import { TSelectItemExtension, type ISelectItemExtension } from './item'
import type { ISelectExtension, ISelectExtensionOptions, TSelectExtensionEvents } from './types'

/**
 * TSelectExtension — всё, что Select знает благодаря коллекции.
 *
 * Две обязанности, и обе требуют одновременно владельца и список, поэтому
 * живут вместе:
 *
 * 1. **ARIA-связка.** Формула идентификаторов одна на обе половинки: на
 *    `aria-controls` в `owner.field.aria` и `id` списка, на
 *    `aria-activedescendant` и `id` опции. Разнеси её, и они однажды
 *    разойдутся.
 * 2. **Проброс `size`/`variant`** с поля на опции — как у ListBox. `disabled`
 *    не пробрасывается, а сочетается: опция выключена, если выключена сама
 *    или выключено поле (`bindDisabledToOwner`).
 *
 * Синхронизации `value` ↔ выбор здесь больше нет: она переехала в
 * `TValueSelectionExtension` движка. Написана она была тут, пока Select был
 * единственным списком со значением; теперь `value` есть и у `TListBox`, и
 * оставить копию значило бы завести две реализации одной мысли.
 *
 * Текст выбранного (`text`) при этом считается здесь — он не про
 * синхронизацию, а про то, что показывать вместо `placeholder`. Он пишется в
 * `owner.field.value` (экземпляр `TInput`, которым в шаблоне показывается
 * поле, в любом режиме, не только `editable`): в `single` это текст
 * выбранного, в `multiple` всегда пусто — там значение в тегах. Наружу `text`
 * отдаётся только ради возврата поля в `TEditablePlugin`, чтобы формула не
 * копировалась. `owner.field.placeholder` следует тому же
 * правилу, что раньше жило в `field_placeholder` фасада: пока в поле есть хоть
 * один тег, плейсхолдер пуст — иначе он проступил бы сквозь них.
 */
export class TSelectExtension<
	TOwner extends ISelect = ISelect,
	TItem extends ISelectItem = ISelectItem,
>
	extends TBaseOwnerItemExtension<TItem, ISelectItemExtension<TItem>, TSelectExtensionEvents>
	implements IExtension<TItem>, ISelectExtension<TItem>
{
	readonly name = 'select' as const

	private readonly _owner: TOwner
	private _text = ''
	private _batch: IBatchExtension<TItem> | null = null

	/**
	 * Подписки на переименование опций, которые сейчас в списке.
	 *
	 * Обработчик у каждой опции свой: ему нужна опция, а событие несёт только
	 * значение. Поэтому он хранится до удаления опции — иначе снять подписку
	 * было бы нечем. `WeakMap` — чтобы запись не удерживала опцию, если движок
	 * выбросят, не удалив из него опции.
	 */
	private readonly _textWatchers = new WeakMap<TItem, () => void>()

	constructor(options: ISelectExtensionOptions<TOwner, TItem>) {
		super(TSelectItemExtension, options)

		this._owner = options.owner
	}

	/** Инстанс поля — item-адаптеру нужен его `closeOnSelect`. */
	get owner(): TOwner {
		return this._owner
	}

	/**
	 * `id` списка и опций строятся от `uid`: он уникален в рамках сессии,
	 * поэтому два Select на странице не столкнутся, даже если значения совпали.
	 */
	get listId(): string {
		return `s-select-list-${this._owner.uid}`
	}

	optionId(item: TItem): string {
		return `s-select-option-${item.uid}`
	}

	/**
	 * Текст выбранного — единственное место его формулы. Не то же, что
	 * `owner.field.value`: во время набора поле уже переписано вводом, а
	 * `TEditablePlugin` возвращает в него именно этот текст.
	 */
	get text(): string {
		return this._text
	}

	/** Сторона отметки выбранного — с поля. Своей у опции нет. */
	get indicator(): TListIndicator {
		return this._owner.indicator
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Поле ссылается на список, а список существует всегда — в отличие от
		// панели у Tabs, которой может и не быть. Пишем в `field.aria`, а не в
		// `owner.aria`: связку со списком объявляет ARIA поля, а не корня Select.
		this._owner.field.aria.add('aria-controls', this.listId)

		// Отбор по тексту опции — знание Select, а не `filter`: общее расширение
		// умеет сравнивать с любыми полями, а какое из них показывается
		// пользователю, знает только компонент.
		const filter = ctx.extensions.filter as IFilterExtension<TItem> | undefined

		if (filter) filter.fields = ['text' as keyof TItem]

		// Отбор доезжает до опции её собственным `visible`, а не через `shown` в
		// разметке: список `shown` рисуется только там, где опции пришли пропом
		// `items`. Объявленные разметкой (`<Select.Item>` детьми) — это чужой
		// слот, и перебрать его коллекция не может; зато у каждой опции есть
		// `visible`, который все шесть адаптеров уже уважают. Отсюда и правило:
		// показана ровно та опция, что осталась в выдаче.
		this._batch = ctx.extensions.batch as IBatchExtension<TItem>
		this._batch.events.on('change:shown', () => this._syncShown())

		ctx.driver.events.on('item:added', (e) => this._onItemAdded(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем опциям `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._onItemAdded(item as TItem))

		// Переименование опции слушается от добавления (`_onItemAdded`) до
		// удаления. Очистка шлёт `item:removed` каждой опции перед `reset` —
		// отдельной подписки на неё не нужно
		ctx.driver.events.on('item:removed', (e) => this._unwatchText(e.item))

		// Итог `disabled` опции отдаёт резольвер — сообщаем тем, у кого он сменился
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

		this._owner.events.on('change:contentFit', () => {
			ctx.driver.valueOf().forEach((item) => this._applyContentFit(item as TItem))
		})

		this._owner.events.on('change:indicator', () => {
			ctx.driver.valueOf().forEach((item) => this._applyIndicator(item as TItem))
		})

		// Сторона отметки доезжает до item-адаптеров
		this.events.relay(this._owner.events, ['change:indicator'])

		const selection = this._selection

		if (selection) {
			selection.events.on('change:selection', () => this._onSelectionChanged())

			ctx.driver.events.on('item:added', () => this._syncSelectedAria())
			ctx.driver.events.on('item:removed', () => this._onSelectionChanged())
		}

		// Плейсхолдер поля — по составу тегов, а не по режиму: инстанс `tags`
		// живёт всё время, пока `multiple`, даже без единого тега. `tags` в
		// `SELECT_OWNER_EXTENSIONS` установлен раньше `select` специально ради
		// этого — `ctx.extensions.tags` здесь уже существует, и его подписка
		// на `change:selection` уже отработала раньше нашей (см. `_onSelectionChanged`).
		this._owner.events.on('change:placeholder', () => this._syncFieldPlaceholder())
		this._tags?.events.on('change:tags', () => this._syncFieldPlaceholder())

		this._syncFieldPlaceholder()
		this._syncFieldValue()
	}

	/**
	 * Выбрать опцию.
	 *
	 * В `single` выбор заменяет прежний, в `multiple` — переключает: нажатие
	 * на уже выбранную опцию снимает выбор.
	 *
	 * Disabled-опция не выбирается: она видна и объявляется скринридером как
	 * недоступная, но нажатие по ней ничего не делает.
	 */
	chooseItem(item: TItem): boolean {
		const selection = this._selection

		if (!selection || item.disabled) return false

		if (selection.multiple) {
			selection.toggle(item)
		} else {
			selection.select(item)

			// В multiple список не закрывается от выбора — иначе выбрать
			// несколько опций подряд было бы невозможно. Закрывает клик по
			// полю (toggleOpen на корне) или клик мимо (TDismissPlugin)
			if (this._owner.closeOnSelect) this._owner.open = false
		}

		return true
	}

	/** Снять выбор целиком — кнопка очистки поля. */
	clear(): void {
		this._selection?.resetSelection()
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as ISelectionExtension<TItem> | undefined
	}

	private get _tags(): TSelectTagsExtension<ISelect, TItem> | undefined {
		return this._ctx?.extensions.tags as TSelectTagsExtension<ISelect, TItem> | undefined
	}

	private _onItemAdded(item: TItem): void {
		bindDisabledToOwner(item, this._owner)
		item.size = this._owner.size
		item.variant = this._owner.variant

		this._applyContentFit(item)
		this._applyIndicator(item)

		item.aria.add('id', this.optionId(item))

		this._watchText(item)
	}

	/**
	 * Слушать переименование опции. Повторный вызов для той же опции второй
	 * подписки не заводит: без `trackBy` состав пересобирается через очистку, и
	 * те же инстансы добавляются заново.
	 */
	private _watchText(item: TItem): void {
		if (this._textWatchers.has(item)) return

		const watcher = (): void => this._onItemRenamed(item)

		this._textWatchers.set(item, watcher)
		item.events.on('change:text', watcher)
	}

	/**
	 * Удалённую опцию Select больше не слушает: в его тексте её нет, а подписка
	 * удерживала бы Select, пока жива сама опция.
	 */
	private _unwatchText(item: TItem): void {
		const watcher = this._textWatchers.get(item)

		if (!watcher) return

		item.events.off('change:text', watcher)
		this._textWatchers.delete(item)
	}

	/**
	 * Текст опции входит в текст выбранного (`text`), только пока она выбрана.
	 * Переименование выбранной обязано дойти и до `text`, и до
	 * `owner.field.value`, который его показывает. Невыбранная не меняет ни
	 * того, ни другого, и поле её переименование не трогает: иначе набранное в
	 * `editable` стиралось бы текстом выбранного — при серверном поиске
	 * приложение обновляет тексты опций прямо во время ввода.
	 */
	private _onItemRenamed(item: TItem): void {
		if (!this._selection?.isSelected(item)) return

		this._syncText()
		this._syncFieldValue()
	}

	/**
	 * `data-content-fit` опции.
	 *
	 * Здесь, а не в шаблоне: иначе правило пришлось бы повторить в каждом из
	 * шести адаптеров. Своего значения у опции нет — в отличие от элемента
	 * ListBox, она берёт значение поля целиком.
	 */
	private _applyContentFit(item: TItem): void {
		item.dataset.add(LIST_CONTENT_FIT_ATTRIBUTE, this._owner.contentFit)
	}

	/**
	 * `data-indicator` опции — значение поля целиком.
	 *
	 * Ставит родительское расширение, а не item-адаптер: адаптеры создаются
	 * лениво, а атрибут обязан стоять с первой отрисовки, включая серверную.
	 */
	private _applyIndicator(item: TItem): void {
		item.dataset.add(LIST_INDICATOR_ATTRIBUTE, this._owner.indicator)
	}

	/**
	 * Выбор изменился — обновляем то, что зависит от него: разметку для
	 * скринридера и текст поля. Само `value` пишет `TValueSelectionExtension`.
	 */
	private _onSelectionChanged(): void {
		this._syncSelectedAria()
		this._syncText()
		this._syncFieldValue()
		this._syncFieldPlaceholder()
	}

	/**
	 * Текст в `owner.field` — в любом режиме, не только `editable`: в
	 * select-only поле тоже показывает выбранное, только не даёт его
	 * редактировать. `multiple` всегда пуст — значение там в тегах, а не в
	 * поле.
	 */
	private _syncFieldValue(): void {
		this._owner.field.value = this._selection?.multiple ? '' : this._text
	}

	/**
	 * Плейсхолдер `owner.field` — пуст, пока в поле есть хоть один тег: родной
	 * плейсхолдер иначе проступил бы сквозь них, потому что `field.value` в
	 * этом случае тоже пуст.
	 */
	private _syncFieldPlaceholder(): void {
		this._owner.field.placeholder = this._tags?.hasTags ? '' : this._owner.placeholder
	}

	/**
	 * `aria-selected` стоит на **всех** опциях, а не только на выбранных:
	 * скринридер объявляет «2 из 7, не выбрана», и для этого нужен атрибут.
	 */
	private _syncSelectedAria(): void {
		const selection = this._selection

		if (!selection || !this._ctx) return

		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('aria-selected', selection.isSelected(item) ? 'true' : 'false')
		})
	}

	/**
	 * Показать то, что осталось в выдаче, и спрятать остальное.
	 *
	 * Пишет `visible` самой опции, поэтому работает одинаково и когда опции
	 * пришли пропом, и когда их объявили разметкой. Обратная сторона: свой
	 * `visible`, выставленный снаружи, отбор перетирает — состав показанного
	 * при включённом отборе принадлежит ему.
	 */
	private _syncShown(): void {
		if (!this._ctx || !this._batch) return

		const shown = new Set<unknown>(this._batch.shown)

		this._ctx.driver.valueOf().forEach((item) => {
			const visible = shown.has(item)

			if (item.visible !== visible) item.visible = visible
		})
	}

	private _syncText(): void {
		const selected = this._selection?.selected ?? []
		const text = selected.map((item) => item.text).join(', ')

		this._text = text
	}
}
