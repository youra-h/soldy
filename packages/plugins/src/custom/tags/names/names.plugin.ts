import type { ITags, TEventSink } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'
import type { TTagsNamesPluginEvents } from './types'

/**
 * TTagsNamesPlugin — имя кнопки «…» набора тегов от локали.
 *
 * Пишет его в набор кнопки (`moreAria`) и отдаёт выходом (`more`): разметка
 * называет им и панель, которую кнопка открывает, — диалог без имени
 * скринридер объявил бы безымянным. Выходом, а не записью в набор панели:
 * имя панели пишет её собственный `TAriaPlugin` из пропа `aria_label` и
 * снял бы чужую запись.
 */
export class TTagsNamesPlugin extends TNamesPlugin<ITags, TTagsNamesPluginEvents> {
	private _more = ''

	/** Имя кнопки «…» — оно же имя панели с непоместившимися тегами. */
	get more(): string {
		return this._more
	}

	protected override get _sink(): TEventSink<TTagsNamesPluginEvents> {
		return this.events
	}

	protected override _name(owner: ITags, translations: TTranslations): void {
		const more = translations.tags.more

		owner.moreAria.add('aria-label', more)

		if (this._more === more) return

		this._more = more
		this._sink.emit('change:more', more)
	}
}
