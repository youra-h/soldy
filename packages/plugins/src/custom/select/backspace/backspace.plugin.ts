import type {
	ISelect,
	ISelectItem,
	ISelectionExtension,
	ISelectTagsExtension,
	ITagsItem,
	TCollectionEngine,
} from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import type { TSelectBackspacePluginEvents } from './types'

/**
 * TSelectBackspacePlugin — удаление выбранных тегов по `Backspace` в пустом
 * поле Select (`editable` + `multiple`).
 *
 * Отдельный плагин, не ветка в `TSelectKeyboardPlugin`: удаление тега не
 * влияет ни на подсветку, ни на `aria-activedescendant`, которыми владеет
 * клавиатурная стратегия, а смешивать их значило бы решать, чья стратегия
 * первой увидит `Backspace`.
 *
 * Слушатель, как и у `TEditablePlugin`, вешается подпиской на условия, а не
 * проверкой внутри обработчика: нужны сразу три — включённое свойство
 * `owner.removeOnBackspace`, `editable: true` и `selection.mode === 'multiple'`.
 * Ни одно из них само по себе не значит, что клавиатуре есть что удалять.
 *
 * Правило взвода: первое нажатие `Backspace` в пустом поле только взводит
 * счётчик, второе и каждое следующее подряд удаляет по одному тегу. Любая
 * другая клавиша, `Backspace` при непустом поле и снятие слушателя сбрасывают
 * счётчик. Автоповтор (`KeyboardEvent.repeat`) не учитывается вовсе — ни
 * взводит, ни сбрасывает.
 *
 * Что считается «последним» — последний тег, а не последний элемент
 * `selection.selected`: пользователь видит теги, не порядок выбора в
 * коллекции (на практике они совпадают, но знание об этом не должно жить в
 * плагине). Тег ищется через `engine.extensions.tags`, снимается выбор — через
 * `engine.extensions.selection.deselect`, а не через driver: плагину сама
 * коллекция опций недоступна на уровне хранилища, только через расширения.
 */
export class TSelectBackspacePlugin extends TBasePlugin<any, TSelectBackspacePluginEvents> {
	private _owner: ISelect | null = null
	private _input: HTMLInputElement | null = null
	private _engine: TCollectionEngine<any, any> | null = null
	private _listening = false
	private _armed = false
	private readonly _onKeyDown = this._handleKeyDown.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ISelect>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element: HTMLElement) => {
			this._input = element.querySelector<HTMLInputElement>('input')
			this._syncListener()
		})

		elementPlugin?.events.on('removed', () => {
			this._unlisten()
			this._input = null
		})

		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine

			this._selectionExtension?.events.on('change:mode', () => this._syncListener())
			this._syncListener()
		})

		this._owner?.events.on('change:removeOnBackspace', () => this._syncListener())
		this._owner?.events.on('change:editable', () => this._syncListener())
	}

	override destroy(): void {
		this._unlisten()

		this._input = null
		this._owner = null
		this._engine = null

		super.destroy()
	}

	private get _selectionExtension(): ISelectionExtension<ISelectItem> | undefined {
		return this._engine?.extensions?.selection as ISelectionExtension<ISelectItem> | undefined
	}

	private get _tagsExtension(): ISelectTagsExtension<ISelectItem> | undefined {
		return this._engine?.extensions?.tags as ISelectTagsExtension<ISelectItem> | undefined
	}

	/** Слушаем `keydown`, только пока все три условия выполнены разом. */
	private _needed(): boolean {
		const owner = this._owner

		return (
			Boolean(owner?.removeOnBackspace) &&
			Boolean(owner?.editable) &&
			Boolean(this._selectionExtension?.multiple)
		)
	}

	private _syncListener(): void {
		if (this._needed()) {
			this._listen()
		} else {
			this._unlisten()
		}
	}

	private _listen(): void {
		if (this._listening || !this._input) return

		this._input.addEventListener('keydown', this._onKeyDown)
		this._listening = true
	}

	private _unlisten(): void {
		this._armed = false

		if (!this._listening) return

		this._input?.removeEventListener('keydown', this._onKeyDown)
		this._listening = false
	}

	private _handleKeyDown(event: KeyboardEvent): void {
		// Автоповтор зажатой клавиши не участвует — ни во взводе, ни в сбросе.
		if (event.repeat) return

		if (event.key !== 'Backspace') {
			this._armed = false

			return
		}

		const value = (event.target as HTMLInputElement | null)?.value ?? ''

		if (value) {
			this._armed = false

			return
		}

		if (!this._armed) {
			this._armed = true

			return
		}

		this._removeLastTag()
	}

	/** Снимает выбор с опции, чей тег стоит последним в поле. */
	private _removeLastTag(): void {
		const selection = this._selectionExtension
		const tags = this._tagsExtension

		if (!selection || !tags) return

		const tagItems = tags.engine?.extensions.batch.items as ReadonlyArray<ITagsItem> | undefined
		const lastTag = tagItems?.[tagItems.length - 1]

		if (!lastTag) return

		const item = (this._engine?.extensions.batch.items as ReadonlyArray<ISelectItem> | undefined)?.find(
			(candidate) => candidate.value === lastTag.value,
		)

		if (item) selection.deselect(item)
	}
}
