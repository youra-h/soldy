import type { IInputControl } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { TInputControlPluginEvents } from './types'

export class TInputControlPlugin extends TBasePlugin<any, TInputControlPluginEvents> {
	static readonly namespace = Symbol('input-control')

	private _input: HTMLInputElement | null = null
	private _instance: IInputControl<any> | null = null
	private _onClick = this._handleClick.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const el = elementPlugin.element
			if (!el) return

			const input = el.querySelector<HTMLInputElement>('input')
			if (!input) return

			this._input = input
			input.addEventListener('click', this._onClick)
		})

		elementPlugin?.events.on('removed', () => {
			this._removeClickListener()
			this._input = null
		})

		this._instance = ctx.getInstance<IInputControl<any>>()
	}

	override destroy(): void {
		this._removeClickListener()
		this._input = null
		this._instance = null
		super.destroy()
	}

	private _handleClick(event: Event): void {
		if (this._instance?.readonly || this._input?.disabled) {
			event.preventDefault()
		}
	}

	private _removeClickListener(): void {
		if (this._input) {
			this._input.removeEventListener('click', this._onClick)
		}
	}
}
