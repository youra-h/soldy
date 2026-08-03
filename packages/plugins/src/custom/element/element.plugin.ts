import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TEvented } from '@soldy/core'
import type { TElementServiceEvents } from './types'

export class TElementPlugin extends TBasePlugin<any, TElementServiceEvents> {
	static readonly namespace = Symbol('element')

	private _element: HTMLElement | null = null
	private _readyResolve: ((el: HTMLElement) => void) | null = null

	get element(): HTMLElement | null {
		return this._element
	}

	set element(el: HTMLElement | null) {
		if (this._element === el) return

		const prev = this._element
		this._element = el

		if (el && !prev) {
			requestAnimationFrame(() => {
				if (this._element !== el) return

				this._readyResolve?.(el)

				this._readyResolve = null
				;(this.events as TEvented<TElementServiceEvents>).emit('ready', el)
			})
		} else if (!el && prev) {
			;(this.events as TEvented<TElementServiceEvents>).emit('removed')
		}
	}

	ready(): Promise<HTMLElement> {
		if (this._element) return Promise.resolve(this._element)

		return new Promise<HTMLElement>((resolve) => {
			this._readyResolve = resolve
		})
	}
}
