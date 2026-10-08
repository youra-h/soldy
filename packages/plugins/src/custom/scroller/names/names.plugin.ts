import type { IScroller } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/**
 * TScrollerNamesPlugin — имена кнопок листания ленты от локали: в
 * `prevAria` и `nextAria`. Кнопка со стрелкой без имени для скринридера
 * безымянна.
 */
export class TScrollerNamesPlugin extends TNamesPlugin<IScroller> {
	protected override _name(owner: IScroller, translations: TTranslations): void {
		owner.prevAria.add('aria-label', translations.scroller.prev)
		owner.nextAria.add('aria-label', translations.scroller.next)
	}
}
