import type { ITextInputControl } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { TInputPluginEvents } from './types'

export class TInputPlugin extends TBasePlugin<any, TInputPluginEvents> {
	static readonly namespace = Symbol('input')

	private _input: HTMLInputElement | null = null
	private _instance: ITextInputControl | null = null
	private _onInput = this._handleInput.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

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

		const target = event.target as HTMLInputElement | null
		if (!target) return

		this._instance.value = target.value
	}

	private _removeInputListener(): void {
		if (this._input) {
			this._input.removeEventListener('input', this._onInput)
		}
	}
}
