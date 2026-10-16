import type { IToastsItem } from '@soldy-ui/core'
import { formatName } from '../../../locale/locale'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/**
 * TToastsItemNamesPlugin — имя кнопки закрытия тоста от локали: в `closeAria`,
 * вместе с текстом тоста («Закрыть Сохранено»), как у тега. Пять одинаковых
 * «Закрыть» в стопке скринридер не различил бы.
 */
export class TToastsItemNamesPlugin extends TNamesPlugin<IToastsItem> {
	protected override _name(owner: IToastsItem, translations: TTranslations): void {
		owner.closeAria.add('aria-label', formatName(translations.toasts.close, owner.text))
	}

	protected override _watch(owner: IToastsItem, name: () => void): void {
		this._listenTo(owner.events, 'change:text', name)
	}
}
