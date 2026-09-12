import { TBaseExtension } from '../../../../../base/collection'
import type {
	IBatchExtension,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import { TTags, createEngineTags } from '../../../../tags'
import type { ITags, TTagsCollection, ITagsItem } from '../../../../tags'
import { shiftSize } from '../../../../../../common'
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
 * `change:selection` (владелец → теги), закрытие тега снимает выбор с опции
 * по совпадению `value` (теги → владелец); эти два пути не должны разойтись,
 * поэтому оба живут здесь.
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

	constructor(options: ISelectTagsExtensionOptions<TOwner>) {
		super()

		this._owner = options.owner
	}

	/** Инстанс `TTags`, пока режим `multiple`; иначе `null`. */
	get tags(): ITags | null {
		return this._tags
	}

	/** Коллекция тегов — та, что рисует `tags` своими элементами. */
	get engine(): TTagsCollection | null {
		return this._engine
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		const selection = this._selection

		if (!selection) return

		selection.events.on('change:mode', () => this._syncMode())
		selection.events.on('change:selection', () => this._syncTags())

		this._owner.events.on('change:disabled', (value: boolean) => {
			if (this._tags) this._tags.disabled = value
		})

		// Тег в полном размере владельца распирает поле по высоте — держим
		// теги на шаг мельче Select, здесь и в стартовом размере ниже.
		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			if (this._tags) this._tags.size = shiftSize(payload.newValue, -1)
		})

		this._owner.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
			if (this._tags) this._tags.variant = payload.newValue
		})

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
			disabled: this._owner.disabled,
			size: shiftSize(this._owner.size, -1),
			variant: this._owner.variant,
		})

		const engine = createEngineTags({ owner: tags })

		engine.extensions.tags.events.on('item:close', (item: ITagsItem) => this._onTagClose(item))

		this._tags = tags
		this._engine = engine

		this._syncTags()

		this.events.emit('change:tags', tags)
	}

	private _destroyTags(): void {
		if (!this._tags) return

		this._tags = null
		this._engine = null

		this.events.emit('change:tags', null)
	}

	/** Выбор Select → набор тегов. Источник истины — коллекция Select. */
	private _syncTags(): void {
		const selection = this._selection
		const engine = this._engine

		if (!selection || !engine) return

		const batch = engine.extensions.batch as IBatchExtension<ITagsItem>
		const source = selection.selected.map((item) => ({ value: item.value, text: item.text }))

		if (source.length === 0) {
			batch.clear()

			return
		}

		// Сырые `{ value, text }`, не `ITagsItem`: `TFactoryExtension` в тегах
		// коллекции превращает их в инстансы `TTagsItem` при вставке — тот же
		// приём, что у `:items` в шаблоне. Тип `patch()` этого не выражает.
		batch.trackBy = (item) => item.value
		batch.patch(source as unknown as ITagsItem[])
	}

	/** Закрытие тега → снять выбор с опции по совпадению `value`. */
	private _onTagClose(tag: ITagsItem): void {
		const selection = this._selection

		if (!selection || !this._ctx) return

		const item = this._ctx.driver.valueOf().find((candidate) => candidate.value === tag.value)

		if (item) selection.deselect(item)
	}
}
