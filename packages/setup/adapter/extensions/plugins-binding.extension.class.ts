/**
 * TPluginsBindingExtension — связывает DOM-элемент с TElementPlugin.
 */
import { TElementPlugin } from '@soldy/plugins'
import type { IAdapterContext } from '../context'

export class TPluginsBindingExtension {
	private _elementPlugin: TElementPlugin | undefined

	constructor(context: IAdapterContext) {
		this._elementPlugin = context.bundle.get(TElementPlugin)

		context.events.on('destroy', () => {
			this.bindElement(null)
		})
	}

	bindElement(el: Element | null): void {
		if (this._elementPlugin) {
			this._elementPlugin.element = el as HTMLElement | null
		}
	}
}
