import { TBasePlugin } from '../../../base'
import type { TListItemPluginEvents } from './types'

/**
 * TListItemPlugin — состояние подсветки элемента списка (клавиатурная навигация).
 *
 * Не управляет выбором: выбор элемента выполняется selection-расширением коллекции.
 * Плагин лишь хранит флаг `highlighted`, которым управляет TListKeyboardPlugin.
 */
export class TListItemPlugin extends TBasePlugin<any, TListItemPluginEvents> {
	private _highlighted = false

	get highlighted(): boolean {
		return this._highlighted
	}

	set highlighted(value: boolean) {
		if (this._highlighted === value) return

		this._highlighted = value

		this.events.emit('change:highlighted', value)
	}
}
