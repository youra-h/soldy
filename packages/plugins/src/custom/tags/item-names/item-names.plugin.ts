import type { ITagsItem } from '@soldy-ui/core'
import { formatName } from '../../../locale/locale'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/**
 * TTagsItemNamesPlugin — имя кнопки закрытия тега от локали: в `closeAria`,
 * вместе с текстом тега, как у таба (`TTabsItemNamesPlugin`). `tabindex` того
 * же набора пишет коллекция, а не плагин.
 */
export class TTagsItemNamesPlugin extends TNamesPlugin<ITagsItem> {
	protected override _name(owner: ITagsItem, translations: TTranslations): void {
		owner.closeAria.add('aria-label', formatName(translations.tags.close, owner.text))
	}

	protected override _watch(owner: ITagsItem, name: () => void): void {
		this._listenTo(owner.events, 'change:text', name)
	}
}
