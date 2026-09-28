import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBatchExtension,
	IExtension,
	IExtensionContext,
	IFilterExtension,
	ISelectionExtension,
} from '../../../../../base/collection'
import { bindDisabledToOwner, notifyOwnerDisabled } from '../../../../../base/control'
import { bindStyleToOwner, notifyOwnerSize, notifyOwnerVariant } from '../../../../../base/stylable'
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
 * 2. **Размер и вид** опции диктует Select (`bindStyleToOwner`) — как у
 *    ListBox: своё значение опции остаётся в `rawValue` и на вид не влияет.
 *    `disabled` не диктуется, а сочетается: опция выключена, если выключена
 *    сама или выключено поле (`bindDisabledToOwner`).
 *
 * Синхронизации `value` ↔ выбор здесь больше нет: она переехала в
 * `TValueSelectionExtension` движка. Написана она была тут, пока Select был
 * единственным списком со значением; теперь `value` есть и у `TListBox`, и
 * оставить копию значило бы завести две реализации одной мысли.
 *
 * Текст выбранного (`text`) при этом считается здесь — он не про
 * синхронизацию, а про то, что показывать вместо `placeholder`. Показывает его
 * `owner.field.value` (экземпляр `TInput`, которым в шаблоне показывается
 * поле, в любом режиме, не только `editable`): в `single` это текст
 * выбранного, в `multiple` всегда пусто — там значение в тегах.
 *
 * Поле пишется двумя путями, и путь выбирает то, откуда пришло изменение:
 *
 * - **выбор пользователя** (`chooseItem`, `clear`) пишет поле всегда, что бы в
 *   нём ни было набрано, и сообщает о себе событием `choose` — по нему
 *   `TEditablePlugin` сбрасывает набранное и отбор;
 * - **всё остальное** — смена `value`, состава и режима выбора,
 *   переименование выбранной опции, снятие выбора закрытием тега или
 *   `Backspace` — пересчитывает `text` или формулу поля, а поле трогает,
 *   только пока оно показывает текст выбранного. Не показывает — значит, в
 *   поле печатают, и набранное доживает до выбора или возврата: при серверном
 *   поиске приложение меняет список прямо во время ввода.
 *
 * Признак набора — само поле, а не флаг «печатают» и не копия записанного:
 * это был бы второй путь к тем же данным. Цена — набранное, совпавшее с
 * формулой поля (в том числе стёртое до пустого, пока текст выбранного пуст),
 * от показа выбранного не отличить.
 *
 * Наружу `text` отдаётся ради возврата поля в `TEditablePlugin`, чтобы формула
 * не копировалась. `owner.field.placeholder` следует тому же
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
	 * `id` списка и опций строятся от основ (`idBase`) Select и опции: они у
	 * каждого экземпляра свои, поэтому два Select на странице не столкнутся,
	 * даже если значения совпали.
	 */
	get listId(): string {
		return `s-select-list-${this._owner.idBase}`
	}

	optionId(item: TItem): string {
		return `s-select-option-${item.idBase}`
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

		// `size` и `variant` опции тоже отдаёт резольвер — сообщаем прежний итог,
		// по нему снимается старый класс
		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			notifyOwnerSize(ctx.driver.valueOf(), payload.oldValue)
		})

		this._owner.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				notifyOwnerVariant(ctx.driver.valueOf(), payload.oldValue)
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
			selection.events.on('change:mode', () => this._onModeChanged())

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

		// Догон выбора: к нашей подписке выбор уже мог сложиться. `_.selected`
		// движка, собранного снаружи, применяет `selection` при установке, а
		// `value` из пропа — расширение `value`, которое в
		// `SELECT_OWNER_EXTENSIONS` стоит раньше нас. Их `change:selection` до
		// нас не дошёл, поэтому `aria-selected`, текст выбранного и плейсхолдер
		// считаем по текущему выбору тем же обработчиком
		this._onSelectionChanged()
		this._writeField()
	}

	/**
	 * Выбрать опцию.
	 *
	 * В `single` выбор заменяет прежний, в `multiple` — переключает: нажатие
	 * на уже выбранную опцию снимает выбор.
	 *
	 * Disabled-опция не выбирается: она видна и объявляется скринридером как
	 * недоступная, но нажатие по ней ничего не делает.
	 *
	 * Это выбор пользователя, поэтому поле переписывается, даже если выбор не
	 * изменился: Enter на уже выбранной опции возвращает её текст вместо
	 * набранного.
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

		this._commitChoice()

		return true
	}

	/**
	 * Снять выбор целиком — кнопка очистки поля. Тоже выбор пользователя,
	 * выбор «ничего»: поле пустеет, даже если выбрано ничего не было, а в нём
	 * был набран текст.
	 */
	clear(): void {
		const selection = this._selection

		if (!selection) return

		selection.resetSelection()

		this._commitChoice()
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as ISelectionExtension<TItem> | undefined
	}

	private get _tags(): TSelectTagsExtension<ISelect, TItem> | undefined {
		return this._ctx?.extensions.tags as TSelectTagsExtension<ISelect, TItem> | undefined
	}

	private _onItemAdded(item: TItem): void {
		bindDisabledToOwner(item, this._owner)
		bindStyleToOwner(item, this._owner)

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
	 * Переименование выбранной обязано дойти до `text`, а через него — до
	 * поля, если оно показывает текст выбранного (`_syncText`), и до её тега:
	 * `change:selection` на переименование не приходит, поэтому теги просим
	 * пересобраться отсюда, а пишет их по-прежнему расширение `tags`. Режим
	 * не проверяется — вне `multiple` тегов нет, и вызов ничего не делает.
	 * Невыбранная не меняет ни текста, ни тегов: при серверном поиске
	 * приложение обновляет тексты опций прямо во время ввода.
	 */
	private _onItemRenamed(item: TItem): void {
		if (!this._selection?.isSelected(item)) return

		this._syncText()
		this._tags?.syncTags()
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
	 * скринридера, текст выбранного и плейсхолдер. Само `value` пишет
	 * `TValueSelectionExtension`.
	 *
	 * Поле здесь пишется мягко (`_syncText`): `change:selection` приходит на
	 * любое изменение выбора, а не только на выбор пользователя. Он же
	 * обработчик `item:removed` — удалённую опцию `TSelectionExtension`
	 * снимает с выбора молча — и догон выбора, сделанного до `install`.
	 */
	private _onSelectionChanged(): void {
		this._syncSelectedAria()
		this._syncText()
		this._syncFieldPlaceholder()
	}

	/**
	 * Режим выбора сменился — вместе с ним формула поля: в `multiple` оно пусто,
	 * в остальных режимах показывает `text`. `single -> multiple` выбор не
	 * трогает, и `change:selection` не приходит, поэтому без этой подписки в
	 * поле оставался текст выбранного рядом с его тегом, а мягкая запись
	 * принимала его за набранный.
	 *
	 * Смена режима — не выбор пользователя, и поле пишется мягко: только если
	 * показывало формулу прежнего режима. `_syncText` не годится — его
	 * `_fieldText()` читает уже новый режим. Прежняя формула к этому событию
	 * всегда равна `text`: из `single` и `none` это сам `text`, а из
	 * `multiple` `TSelectionExtension.mode` выходит, сняв выбор до
	 * `change:mode`, — `text` уже пуст, как и формула `multiple`. Сверка
	 * держится на этом порядке сброса: оставь `TSelectionExtension` выбор при
	 * выходе из `multiple`, и поле, показывавшее пустую формулу, не получило бы
	 * текст выбранного.
	 */
	private _onModeChanged(): void {
		if (this._owner.field.value === this._text) this._writeField()
	}

	/**
	 * Выбор пользователя состоялся: поле показывает его, что бы в нём ни было
	 * набрано, а подписчики `choose` узнают, что набор прерван. Зовётся после
	 * изменения выбора — `text` к этому моменту уже пересчитан.
	 */
	private _commitChoice(): void {
		this._writeField()
		this.events.emit('choose')
	}

	/**
	 * Формула поля — что оно показывает, пока в нём не печатают. В любом
	 * режиме, не только `editable`: в select-only поле тоже показывает
	 * выбранное, только не даёт его редактировать. `multiple` всегда пуст —
	 * значение там в тегах, а не в поле.
	 */
	private _fieldText(): string {
		return this._selection?.multiple ? '' : this._text
	}

	/**
	 * Безусловная запись поля: набранное, если оно было, пропадает. Так пишут
	 * только выбор пользователя (`_commitChoice`) и первая запись в `install`.
	 */
	private _writeField(): void {
		this._owner.field.value = this._fieldText()
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

	/**
	 * Пересчитать `text` — мягкая запись поля: оно следует за текстом, только
	 * пока показывает текст выбранного, то есть в нём не печатают.
	 *
	 * Поле сверяется с формулой до пересчёта: после него оно разошлось бы с
	 * `text` и тогда, когда в нём ничего не набирали. Набранное остаётся на
	 * месте, а возврат поля (`TEditablePlugin`) покажет уже свежий `text`.
	 */
	private _syncText(): void {
		const showsSelected = this._owner.field.value === this._fieldText()
		const selected = this._selection?.selected ?? []

		this._text = selected.map((item) => item.text).join(', ')

		if (showsSelected) this._writeField()
	}
}
