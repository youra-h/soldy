import type { TCollectionEngine, TSelectEditableMode } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import { TSelectKeyboardPlugin } from '../keyboard'
import type { TEditablePluginEvents } from './types'

/** Минимум, который плагину нужен от поля. */
interface IEditableOwner {
	editable: boolean
	editableMode: TSelectEditableMode
	open: boolean
	events: { on(name: string, handler: (...args: any[]) => void): unknown }
}

/**
 * TEditablePlugin — реакция на ввод текста в поле Select при `editable: true`.
 *
 * `editableMode` (см. `TSelect`) — значение с тремя состояниями, а этот плагин
 * — операция над ним: `none` ввод игнорирует, `search` и `filter` подсвечивают
 * первую опцию, чей текст начинается с набранного, тем же алгоритмом, что и
 * набор по буквам с клавиатуры — `TSelectKeyboardPlugin.highlightByText`.
 * `filter` пока не фильтрует: скрытие несовпавших опций — отдельная задача,
 * до неё оба режима ведут себя одинаково.
 *
 * Слушает `input` вложенного `<input>`, а не `keydown`: текст меняется не
 * только с клавиатуры, но и вставкой, автозаполнением, IME или очисткой поля
 * — всё это `input`-событие ловит одинаково. Узел ищется так же, как в
 * `TInputPlugin` (`el.querySelector('input')`) — разметку и адаптеры трогать
 * не пришлось.
 *
 * На закрытии панели набранное сбрасывается, а в поле возвращается текст
 * выбранного (`engine.extensions.select.text`) — через прямую запись в DOM.
 * Обойтись реактивным `:value="text"` нельзя: если текст выбранного не
 * менялся, Vue не перерисует поле, и набранное так и останется висеть.
 */
export class TEditablePlugin extends TBasePlugin<any, TEditablePluginEvents> {
	private _owner: IEditableOwner | null = null
	private _keyboard: TSelectKeyboardPlugin | null = null
	private _engine: TCollectionEngine<any, any> | null = null
	private _input: HTMLInputElement | null = null
	private _query = ''
	private readonly _onInput = this._handleInput.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IEditableOwner>() ?? null
		this._keyboard = ctx.get(TSelectKeyboardPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const el = elementPlugin.element

			if (!el) return

			const input = el.querySelector<HTMLInputElement>('input')

			if (!input) return

			this._input = input
			input.addEventListener('input', this._onInput)
		})

		elementPlugin?.events.on('removed', () => {
			this._removeInputListener()
			this._input = null
		})

		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
		})

		this._owner?.events.on('close', () => this._reset())
	}

	override destroy(): void {
		this._removeInputListener()

		this._input = null
		this._owner = null
		this._keyboard = null
		this._engine = null

		super.destroy()
	}

	/** Что сейчас набрано в поле — до выбора или закрытия панели. */
	get query(): string {
		return this._query
	}

	private _handleInput(event: Event): void {
		const owner = this._owner

		if (!owner || !owner.editable || owner.editableMode === 'none') return

		const target = event.target as HTMLInputElement | null
		const value = target?.value ?? ''

		this._setQuery(value)

		if (!value) return

		owner.open = true
		this._keyboard?.highlightByText(value)
	}

	private _setQuery(value: string): void {
		if (this._query === value) return

		this._query = value
		;(this.events as unknown as {
			emit(name: 'change:query', value: string): void
		}).emit('change:query', value)
	}

	/** Панель закрылась — набранное сбрасывается, поле возвращает текст выбранного. */
	private _reset(): void {
		this._setQuery('')

		if (this._input) this._input.value = this._selectedText()
	}

	private _selectedText(): string {
		const select = this._engine?.extensions?.select as { text?: string } | undefined

		return select?.text ?? ''
	}

	private _removeInputListener(): void {
		if (this._input) this._input.removeEventListener('input', this._onInput)
	}
}
