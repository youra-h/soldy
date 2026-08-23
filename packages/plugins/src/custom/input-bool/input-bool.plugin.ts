import type { ICheckBox } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { TInputBoolPluginEvents } from './types'

export class TInputBoolPlugin extends TBasePlugin<any, TInputBoolPluginEvents> {
	private _input: HTMLInputElement | null = null
	private _instance: ICheckBox | null = null
	private _onChange = this._handleChange.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const el = elementPlugin.element
			if (!el) return

			const input = el.querySelector<HTMLInputElement>('input')
			if (!input) return

			this._input = input
			input.addEventListener('change', this._onChange)
		})

		elementPlugin?.events.on('removed', () => {
			this._removeInputListener()
			this._input = null
		})

		this._instance = ctx.getInstance<ICheckBox>()
	}

	override destroy(): void {
		this._removeInputListener()
		this._input = null
		this._instance = null
		super.destroy()
	}

	private _handleChange(event: Event): void {
		if (this._instance?.readonly || this._input?.disabled) {
			event.preventDefault()
			return
		}

		this._instance?.toggle()
		this.events.emit('change:value', { value: this._instance?.value })
	}

	private _removeInputListener(): void {
		if (this._input) {
			this._input.removeEventListener('change', this._onChange)
		}
	}
}
