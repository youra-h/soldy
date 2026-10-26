import { TBaseExtension, selectionOf } from '../../../../../base/collection'
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
import type { ISelectTagsExtension, TSelectTagsExtensionEvents } from './types'
import type { TSelectEngineOptions } from '../select'

/**
 * TSelectTagsExtension — the tags in the Select field under multiple selection.
 *
 * A second component with its own collection, not markup: the "option ⇄ tag"
 * link has to live in one place rather than repeat in six adapters.
 *
 * The source of truth is one — the Select's selection. A tag appears and goes
 * after `change:selection` (owner → tags), and closing a tag deselects the
 * option with the same `value` (tags → owner); the two paths must not diverge,
 * so both live here.
 *
 * A selected option removed from the list leaves the selection, and the
 * selection announces it with the same `change:selection` (AGENTS.md,
 * «Удаление выбранного — смена выбора»), so the option's tag goes too.
 * `value` remembers the option and waits for it to come back, like the
 * selected text in `single`: when the option is back in the list, its tag is
 * back as well.
 *
 * The tag text also follows the renaming of a selected option, though
 * `change:selection` does not come on it. The renaming is listened to by
 * `TSelectExtension`, which subscribes to each selected option once and asks
 * the tags to rebuild (`syncTags`), while only this extension writes to the
 * tag collection. A patch by `value` changes the text of the existing tag in
 * place rather than recreating it.
 *
 * The `TTags` instance exists only in `multiple`: in `single` and `none` the
 * field shows text, not tags, and a second set would be extra state.
 *
 * `disabled`, `size` and `variant` of the tags are the Select's. The Select is
 * an engine option (`owner`): it comes and goes after assembly, and the
 * extension watches it.
 */
export class TSelectTagsExtension<
	TOwner extends ISelect = ISelect,
	TItem extends ISelectItem = ISelectItem,
>
	extends TBaseExtension<TItem, TSelectTagsExtensionEvents, TSelectEngineOptions<TOwner>>
	implements IExtension<TItem>, ISelectTagsExtension<TItem>
{
	readonly name = 'tags' as const

	private _tags: ITags | null = null
	private _engine: TTagsCollection | null = null
	/**
	 * Режим переполнения ряда тегов — свойство поля, а не самих тегов: инстанс
	 * `TTags` приходит и уходит вместе с `multiple`, а выбор потребителя
	 * остаётся. Тот же приём, что у `size` и `variant`, только источник —
	 * разметка, а не владелец.
	 */
	private _overflow: TTagsOverflow = 'wrap'

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

	override install(ctx: IExtensionContext<TItem, TSelectEngineOptions<TOwner>>): void {
		super.install(ctx)

		const selection = this._selection

		if (!selection) return

		selection.events.on('change:mode', () => this._syncMode())
		// Удалённую выбранную опцию выбор тоже объявляет `change:selection`.
		// `select` стоит в составе после нас и плейсхолдер считает по уже
		// пересобранным тегам
		selection.events.on('change:selection', () => this.syncTags())

		// Владелец — опция движка. Подписки на него живут в области наблюдателя —
		// сменился владелец, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			if (this._tags) this._applyOwner(this._tags, owner)

			scope.on(owner.events, 'change:disabled', (value: boolean) => {
				if (this._tags) this._tags.disabled = value
			})

			scope.on(owner.events, 'change:size', (payload: TValuePayload<TComponentSize>) => {
				if (this._tags) this._tags.size = payload.newValue
			})

			scope.on(
				owner.events,
				'change:variant',
				(payload: TValuePayload<TComponentVariant | undefined>) => {
					if (this._tags) this._tags.variant = payload.newValue
				},
			)
		})

		this._syncMode()
	}

	/** `disabled`, `size` и `variant` тегов — Select'а. */
	private _applyOwner(tags: ITags, owner: TOwner): void {
		tags.disabled = owner.disabled
		tags.size = owner.size
		tags.variant = owner.variant
	}

	private get _selection(): ISelectionExtension<TItem> | undefined {
		return selectionOf(this._ctx)
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
		const tags = new TTags({ closable: true, overflow: this._overflow })
		const owner = this._ctx.options.get('owner')

		if (owner) this._applyOwner(tags, owner)

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
