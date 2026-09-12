import type { TSelectEditableMode } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TSelectKeyboardPlugin } from '../keyboard'
import type { TEditablePluginEvents } from './types'

/** Минимум, который плагину нужен от поля. */
interface IEditableOwner {
	editable: boolean
	editableMode: TSelectEditableMode
	open: boolean
	inputValue: string
	events: { on(name: string, handler: (...args: any[]) => void): unknown }
}

/**
 * TEditablePlugin — реакция на ввод текста в поле Select при `editable: true`.
 *
 * `editableMode` (см. `TSelect`) — значение с тремя состояниями, а этот плагин
 * — операция над ним: `none` ввод игнорирует, `search` и `filter` подсвечивают
 * первую опцию, чей текст начинается с набранного, тем же алгоритмом, что и
 * набор по буквам с клавиатуры — `TSelectKeyboardPlugin.highlightByText`.
 * Фильтрация (`filter.query`) и сброс поля — в `TSelectExtension`: у него уже
 * есть и владелец, и коллекция. Плагин отвечает только за одно: «ввод →
 * `owner.inputValue`».
 *
 * Слушает `input` вложенного `<input>`, а не `keydown`: текст меняется не
 * только с клавиатуры, но и вставкой, автозаполнением, IME или очисткой поля
 * — всё это `input`-событие ловит одинаково. Узел ищется так же, как в
 * `TInputPlugin` (`el.querySelector('input')`) — разметку и адаптеры трогать
 * не пришлось.
 */
export class TEditablePlugin extends TBasePlugin<any, TEditablePluginEvents> {
	private _owner: IEditableOwner | null = null
	private _keyboard: TSelectKeyboardPlugin | null = null
	private _input: HTMLInputElement | null = null
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
	}

	override destroy(): void {
		this._removeInputListener()

		this._input = null
		this._owner = null
		this._keyboard = null

		super.destroy()
	}

	private _handleInput(event: Event): void {
		const owner = this._owner

		if (!owner || !owner.editable || owner.editableMode === 'none') return

		const target = event.target as HTMLInputElement | null
		const value = target?.value ?? ''

		owner.inputValue = value

		if (!value) return

		owner.open = true
		this._keyboard?.highlightByText(value)
	}

	private _removeInputListener(): void {
		if (this._input) this._input.removeEventListener('input', this._onInput)
	}
}
