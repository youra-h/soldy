import type { IComponentView } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import type { TListItemPluginEvents } from './types'

/**
 * TListItemPlugin — состояние подсветки элемента списка (клавиатурная навигация).
 *
 * Не управляет выбором: выбор элемента выполняется selection-расширением коллекции.
 * Плагин лишь хранит флаг `highlighted`, которым управляет TListKeyboardPlugin.
 *
 * Подсветку отдаёт теме сам — через `data-highlighted`. Раньше это делал
 * шаблон, и два компонента успели разойтись: ListBox отдавал значение сырым,
 * Select приводил его через `String(!!value)`. Оба варианта работали по
 * случайности; здесь преобразование одно и живёт рядом с состоянием.
 *
 * В DOM плагин не ходит — пишет в набор, а раскладывает его шаблон, синхронно.
 */
export class TListItemPlugin extends TBasePlugin<any, TListItemPluginEvents> {
	private _instance: IComponentView | null = null
	private _highlighted = false

	override install(ctx: IPluginContext, options?: object): void {
		super.install(ctx, options)

		this._instance = ctx.getInstance<IComponentView>()
		this._apply()
	}

	get highlighted(): boolean {
		return this._highlighted
	}

	set highlighted(value: boolean) {
		if (this._highlighted === value) return

		this._highlighted = value
		this._apply()

		this.events.emit('change:highlighted', value)
	}

	private _apply(): void {
		this._instance?.dataset.add('highlighted', this._highlighted)
	}

	override destroy(): void {
		this._instance = null

		super.destroy()
	}
}
