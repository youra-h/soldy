import type { TEventSink } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'
import type { TTableNamesPluginEvents } from './types'

/**
 * TTableNamesPlugin — имя чекбокса «выбрать все» таблицы от локали.
 *
 * Выходом (`selectAll`), а не записью в набор: у ячейки шапки колонки выбора
 * своего текста нет, а чекбокс — свой компонент, и имя ему разметка отдаёт
 * пропом `aria_label`, который пишет его собственный `TAriaPlugin`.
 */
export class TTableNamesPlugin extends TNamesPlugin<object, TTableNamesPluginEvents> {
	private _selectAll = ''

	/** Имя чекбокса «выбрать все» в шапке колонки выбора. */
	get selectAll(): string {
		return this._selectAll
	}

	protected override get _sink(): TEventSink<TTableNamesPluginEvents> {
		return this.events
	}

	protected override _name(_owner: object, translations: TTranslations): void {
		const selectAll = translations.table.selectAll

		if (this._selectAll === selectAll) return

		this._selectAll = selectAll
		this._sink.emit('change:selectAll', selectAll)
	}
}
