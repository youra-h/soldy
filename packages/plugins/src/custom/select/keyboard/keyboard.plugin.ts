import type { TCollectionEngine } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TListItemPlugin } from '../../list/item'
import type { ISelectKeyboardPluginOptions, TSelectKeyboardPluginEvents } from './types'

/** Минимум, который плагину нужен от поля. */
interface ISelectOwner {
	open: boolean
	openable: boolean
	aria: { add(name: string, value: string | null): unknown }
	events: { on(name: string, handler: (...args: any[]) => void): unknown }
}

/** Минимум, который плагину нужен от опции. */
interface ISelectOption {
	uid: string | number
	text: string
	disabled: boolean
	rendered: boolean
	visible: boolean
}

const NAVIGATION = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End'])

/**
 * TSelectKeyboardPlugin — клавиатура поля выбора по паттерну APG Combobox
 * (вариант select-only).
 *
 * Ключевое свойство паттерна: **DOM-фокус никогда не уходит с поля**. Поэтому
 * `keydown` слушается на корне Select, а не на списке, и панель может быть
 * телепортирована куда угодно — на навигацию это не влияет. Подсветку для
 * скринридера передаёт `aria-activedescendant` на поле, а визуально её ведёт
 * `TListItemPlugin` каждой опции.
 *
 * Отличие от `TListKeyboardPlugin`, который делает похожее для ListBox: там
 * список — самостоятельный виджет, он сам в порядке обхода и сам держит фокус.
 * Здесь фокус чужой, добавляются открытие/закрытие, `Home`/`End`, `Escape`,
 * набор по буквам и пропуск недоступных опций. Общий базовый плагин имеет
 * смысл выделить, когда обе реализации устоятся, — не раньше.
 *
 * Disabled-опции пропускаются при навигации: подсветить то, что нельзя
 * выбрать, значит завести пользователя в тупик.
 */
export class TSelectKeyboardPlugin extends TBasePlugin<any, TSelectKeyboardPluginEvents> {
	private _element: HTMLElement | null = null
	private _owner: ISelectOwner | null = null
	private _bundles: TCollectionBundlesPlugin | null = null
	private _elements: TCollectionElements | null = null
	private _collection: TCollectionEngine<any, any> | null = null
	private _highlighted: string | number | null = null
	private _typeahead = ''
	private _typeaheadAt = 0
	private _typeaheadTimeout = 500

	override install(ctx: IPluginContext, options?: ISelectKeyboardPluginOptions): void {
		super.install(ctx, options)

		this._typeaheadTimeout = options?.typeaheadTimeout ?? this._typeaheadTimeout
		this._owner = ctx.getInstance<ISelectOwner>() ?? null
		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			element.addEventListener('keydown', this._onKeyDown)
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element?.removeEventListener('keydown', this._onKeyDown)
			this._element = null
		})

		this._bundles?.events.on('engine:bound', (collection) => {
			this._collection = collection
		})

		// Закрытая панель подсветку не держит: она про навигацию, а не про выбор
		this._owner?.events.on('close', () => this._clearHighlight())
		this._owner?.events.on('open', () => this._highlightSelected())
	}

	override destroy(): void {
		this._element?.removeEventListener('keydown', this._onKeyDown)

		this._element = null
		this._owner = null
		this._bundles = null
		this._elements = null
		this._collection = null

		super.destroy()
	}

	/** Опция, на которой стоит подсветка. */
	get highlightedUid(): string | number | null {
		return this._highlighted
	}

	/** Опции, доступные для навигации: видимые и не отключённые. */
	private _options(): ISelectOption[] {
		const all = (this._collection?.driver ?? []) as ISelectOption[]

		return [...all].filter((item) => !item.disabled && item.rendered && item.visible)
	}

	private _indexOf(uid: string | number | null): number {
		if (uid == null) return -1

		return this._options().findIndex((item) => item.uid === uid)
	}

	private readonly _onKeyDown = (e: KeyboardEvent): void => {
		const owner = this._owner

		if (!owner) return

		if (owner.open) {
			this._handleOpen(e, owner)

			return
		}

		this._handleClosed(e, owner)
	}

	/**
	 * Закрытая панель. Стрелки и активация открывают; `↑` при этом встаёт на
	 * последнюю опцию — так пользователь попадает в конец списка одним нажатием.
	 */
	private _handleClosed(e: KeyboardEvent, owner: ISelectOwner): void {
		if (!owner.openable) return

		const opens = NAVIGATION.has(e.key) || e.key === 'Enter' || e.key === ' '

		if (opens) {
			e.preventDefault()
			owner.open = true

			if (e.key === 'ArrowUp' || e.key === 'End') {
				this._highlightEdge('last')
			} else if (e.key === 'ArrowDown' || e.key === 'Home') {
				this._highlightEdge('first')
			}

			return
		}

		if (this._isPrintable(e)) {
			e.preventDefault()
			owner.open = true
			this._typeaheadTo(e.key)
		}
	}

	/**
	 * Открытая панель. `Tab` не перехватываем: он должен увести фокус дальше
	 * по форме, панель при этом закрывается.
	 */
	private _handleOpen(e: KeyboardEvent, owner: ISelectOwner): void {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				this._move(1)

				return

			case 'ArrowUp':
				e.preventDefault()
				this._move(-1)

				return

			case 'Home':
				e.preventDefault()
				this._highlightEdge('first')

				return

			case 'End':
				e.preventDefault()
				this._highlightEdge('last')

				return

			case 'Enter':
			case ' ':
				e.preventDefault()
				this._chooseHighlighted()

				return

			case 'Escape':
				e.preventDefault()
				owner.open = false

				return

			case 'Tab':
				owner.open = false

				return
		}

		if (this._isPrintable(e)) {
			e.preventDefault()
			this._typeaheadTo(e.key)
		}
	}

	/** Печатный символ, а не сочетание с модификатором. */
	private _isPrintable(e: KeyboardEvent): boolean {
		return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
	}

	/**
	 * Навигация зациклена: с последней опции `↓` уводит на первую. Так принято
	 * в выпадающих списках и так делают Ark и Radix.
	 */
	private _move(step: number): void {
		const options = this._options()

		if (options.length === 0) return

		const current = this._indexOf(this._highlighted)

		if (current === -1) {
			this._highlight(options[step > 0 ? 0 : options.length - 1].uid)

			return
		}

		const next = (current + step + options.length) % options.length

		this._highlight(options[next].uid)
	}

	private _highlightEdge(edge: 'first' | 'last'): void {
		const options = this._options()

		if (options.length === 0) return

		this._highlight(options[edge === 'first' ? 0 : options.length - 1].uid)
	}

	/** При открытии подсветка встаёт на выбранное — иначе на первую опцию. */
	private _highlightSelected(): void {
		const selected = this._collection?.extensions?.selection?.selected?.[0] as
			| ISelectOption
			| undefined

		if (selected && this._indexOf(selected.uid) !== -1) {
			this._highlight(selected.uid)

			return
		}

		this._highlightEdge('first')
	}

	private _chooseHighlighted(): void {
		if (this._highlighted == null) return

		const item = this._options().find((option) => option.uid === this._highlighted)

		if (!item) return

		this._collection?.extensions?.select?.chooseItem(item)
	}

	/** Ищет опцию, чей текст начинается с накопленного буфера. */
	private _typeaheadTo(char: string): void {
		const now = Date.now()

		this._typeahead =
			now - this._typeaheadAt > this._typeaheadTimeout ? char : this._typeahead + char
		this._typeaheadAt = now

		const needle = this._typeahead.toLowerCase()
		const match = this._options().find((item) => item.text.toLowerCase().startsWith(needle))

		if (match) this._highlight(match.uid)
	}

	private _itemPlugin(uid: string | number): TListItemPlugin | undefined {
		return this._bundles?.getByUid(uid)?.get(TListItemPlugin)
	}

	private _highlight(uid: string | number): void {
		if (this._highlighted === uid) return

		if (this._highlighted != null) {
			const previous = this._itemPlugin(this._highlighted)

			if (previous) previous.highlighted = false
		}

		this._highlighted = uid

		const plugin = this._itemPlugin(uid)

		if (plugin) plugin.highlighted = true

		this._syncActiveDescendant()
		this._scrollIntoView(uid)

		this.events.emit('change:highlight', uid)
	}

	private _clearHighlight(): void {
		if (this._highlighted == null) return

		const plugin = this._itemPlugin(this._highlighted)

		if (plugin) plugin.highlighted = false

		this._highlighted = null
		this._typeahead = ''

		this._syncActiveDescendant()
		this.events.emit('change:highlight', null)
	}

	/**
	 * Подсветка для скринридера. Указывает на `id` опции — тот самый, что
	 * проставляет `TSelectExtension`; формула одна на обе стороны.
	 */
	private _syncActiveDescendant(): void {
		const id = this._highlighted == null ? null : this._optionElement(this._highlighted)?.id

		this._owner?.aria.add('aria-activedescendant', id ?? null)
	}

	private _optionElement(uid: string | number): HTMLElement | null {
		return this._elements?.getElementByUid(uid) ?? null
	}

	private _scrollIntoView(uid: string | number): void {
		this._optionElement(uid)?.scrollIntoView({ block: 'nearest' })
	}
}
