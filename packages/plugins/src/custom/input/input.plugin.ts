import type { ITextInputControl } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import { fieldOf } from './field'
import type { TInputPluginEvents } from './types'

export class TInputPlugin extends TBasePlugin<any, TInputPluginEvents> {
	private _input: HTMLInputElement | HTMLTextAreaElement | null = null
	private _instance: ITextInputControl | null = null
	private _onInput = this._handleInput.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const el = elementPlugin.element
			if (!el) return

			// Поле текста — `<input>` у Input, `<textarea>` у Textarea
			const input = fieldOf(el)
			if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return

			this._input = input
			input.addEventListener('input', this._onInput)
		})

		elementPlugin?.events.on('removed', () => {
			this._removeInputListener()
			this._input = null
		})

		this._instance = ctx.getInstance<ITextInputControl>()
	}

	override destroy(): void {
		this._removeInputListener()
		this._input = null
		this._instance = null
		super.destroy()
	}

	private _handleInput(event: Event): void {
		if (!this._instance) return

		if (this._instance.readonly || this._instance.disabled) {
			event.preventDefault()
			return
		}

		// Текст — из поля плагина: слушатель стоит на нём, и цель события — оно же
		if (!this._input) return

		this._instance.value = this._input.value
	}

	private _removeInputListener(): void {
		if (this._input) {
			this._input.removeEventListener('input', this._onInput)
		}
	}
}
