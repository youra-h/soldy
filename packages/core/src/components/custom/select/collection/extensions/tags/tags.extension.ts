import { TBaseExtension } from '../../../../../base/collection'
import type {
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TTags, createEngineTags } from '../../../../tags'
import type { ITags, TTagsCollection, ITagsItem, TTagsOverflow } from '../../../../tags'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import type { ISelect } from '../../../types'
import type { ISelectItem } from '../../../item/types'
import type {
	ISelectTagsExtension,
	ISelectTagsExtensionOptions,
	TSelectTagsExtensionEvents,
} from './types'

/**
 * TSelectTagsExtension — теги в поле Select при множественном выборе.
 *
 * Второй компонент со своей коллекцией, а не разметка: связка «опция ⇄ тег»
 * должна жить в одном месте, а не повторяться в шести адаптерах.
 *
 * Источник истины один — выбор Select. Тег появляется и пропадает вслед за
 * `change:selection` и `item:removed` (владелец → теги), закрытие тега снимает
 * выбор с опции по совпадению `value` (теги → владелец); эти два пути не
 * должны разойтись, поэтому оба живут здесь.
 *
 * `item:removed` слушается отдельно, потому что выбранную опцию, убранную из
 * списка, `TSelectionExtension` снимает с выбора молча, без
 * `change:selection`. Тот же приём у `TSelectExtension`. Иначе тег убранной
 * опции то оставался, то пропадал — в зависимости от того, сколько опций
 * выбрано и появились ли в выдаче новые: `change:selection` доходил случайно,
 * побочным эффектом сброса выбора в `TValueSelectionExtension`. Оставшийся тег
 * было нечем закрыть: `value` опцию помнит, а в списке её нет, и снимать выбор
 * не с кого. `value` ждёт возвращения опции — так же, как текст выбранного в
 * `single`; вернётся опция в выдачу — вернётся и её тег.
 *
 * Текст тега следует и за переименованием выбранной опции, хотя
 * `change:selection` на него не приходит. Переименование слушает
 * `TSelectExtension` — подписка на опцию у Select одна — и просит теги
 * пересобраться (`syncTags`), а пишет в коллекцию тегов по-прежнему только
 * это расширение. Патч по `value` меняет текст существующего тега на месте,
 * а не пересоздаёт тег.
 *
 * Инстанс `TTags` существует только в `multiple` — у `single`/`none` в поле
 * показывается текст, а не теги, второй набор был бы лишним состоянием.
 */
export class TSelectTagsExtension<
	TOwner extends ISelect = ISelect,
	TItem extends ISelectItem = ISelectItem,
>
	extends TBaseExtension<TItem, TSelectTagsExtensionEvents>
	implements IExtension<TItem>, ISelectTagsExtension<TItem>
{
	readonly name = 'tags' as const

	private readonly _owner: TOwner
	private _tags: ITags | null = null
	private _engine: TTagsCollection | null = null
	/**
	 * Режим переполнения ряда тегов — свойство поля, а не самих тегов: инстанс
	 * `TTags` приходит и уходит вместе с `multiple`, а выбор потребителя
	 * остаётся. Тот же приём, что у `size` и `variant`, только источник —
	 * разметка, а не владелец.
	 */
	private _overflow: TTagsOverflow = 'wrap'

	constructor(options: ISelectTagsExtensionOptions<TOwner>) {
		super()

		this._owner = options.owner
	}

	/** Что делать с тегами, которым не хватило строки поля. */
	get overflow(): TTagsOverflow {
		return this._overflow
	}

	set overflow(value: TTagsOverflow) {
		if (this._overflow === value) return

		this._overflow = value

		if (this._tags) this._tags.overflow = value

		this.events.emit('change:overflow', value)
	}

	/** Инстанс `TTags`, пока режим `multiple`; иначе `null`. */
	get tags(): ITags | null {
		return this._tags
	}

	/** Коллекция тегов — та, что рисует `tags` своими элементами. */
	get engine(): TTagsCollection | null {
		return this._engine
	}

	/**
	 * Есть ли в поле хоть один тег.
	 *
	 * Не то же, что наличие инстанса `tags`: инстанс живёт всё время, пока
	 * режим `multiple`, даже когда не выбрано ничего. Спрашивать состав у
	 * коллекции — дело владельца коллекции, то есть этого расширения; фасаду
	 * Select для его вопросов достаточно ответа `да/нет`.
	 */
	get hasTags(): boolean {
		return (this._engine?.extensions.batch.items.length ?? 0) > 0
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		const selection = this._selection

		if (!selection) return

		selection.events.on('change:mode', () => this._syncMode())
		selection.events.on('change:selection', () => this.syncTags())

		// Удалённую опцию `TSelectionExtension` снимает с выбора молча, поэтому
		// удаление слушаем сами. Его подписка заведена раньше нашей — `selection`
		// стоит в составе до `tags`, — значит к этому моменту выбор уже без
		// удалённой опции. `select` стоит после нас и плейсхолдер считает по уже
		// пересобранным тегам
		ctx.driver.events.on('item:removed', () => this.syncTags())

		// Своё `disabled` набора тегов — итог Select, как у поля
		this._owner.events.on('change:disabled:resolved', (value: boolean) => {
			if (this._tags) this._tags.disabled = value
		})

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			if (this._tags) this._tags.size = payload.newValue
		})

		this._owner.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				if (this._tags) this._tags.variant = payload.newValue
			},
		)

		this._syncMode()
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as ISelectionExtension<TItem> | undefined
	}

	/** Инстанс появляется в `multiple` и пропадает в любом другом режиме. */
	private _syncMode(): void {
		const selection = this._selection

		if (!selection) return

		if (selection.multiple) {
			if (!this._tags) this._createTags()
		} else if (this._tags) {
			this._destroyTags()
		}
	}

	private _createTags(): void {
		const tags = new TTags({
			closable: true,
			disabled: this._owner.disabledResolved,
			size: this._owner.size,
			variant: this._owner.variant,
			overflow: this._overflow,
		})

		const engine = createEngineTags({ owner: tags })

		engine.extensions.tags.events.on('item:close', (item: ITagsItem) => this._onTagClose(item))

		this._tags = tags
		this._engine = engine

		this.syncTags()

		this.events.emit('change:tags', tags)
	}

	private _destroyTags(): void {
		if (!this._tags) return

		this._tags = null
		this._engine = null

		this.events.emit('change:tags', null)
	}

	/**
	 * Выбор Select → набор тегов. Источник истины — коллекция Select.
	 *
	 * Публичный ради переименования выбранной опции: его слушает
	 * `TSelectExtension`, а не это расширение (см. описание класса). Вне
	 * `multiple` коллекции тегов нет, и вызов ничего не делает.
	 */
	syncTags(): void {
		const selection = this._selection
		const engine = this._engine

		if (!selection || !engine) return

		const batch = engine.extensions.batch
		const source = selection.selected.map((item) => ({ value: item.value, text: item.text }))

		if (source.length === 0) {
			batch.clear()

			return
		}

		// Сырые `{ value, text }`, не `ITagsItem`: `TFactoryExtension` в тегах
		// коллекции превращает их в инстансы `TTagsItem` при вставке — тот же
		// приём, что у `:items` в шаблоне.
		batch.trackBy = (item) => item.value
		batch.patch(source)
	}

	/** Закрытие тега → снять выбор с опции по совпадению `value`. */
	private _onTagClose(tag: ITagsItem): void {
		const selection = this._selection

		if (!selection || !this._ctx) return

		const item = this._ctx.driver.valueOf().find((candidate) => candidate.value === tag.value)

		if (item) selection.deselect(item)
	}
}
