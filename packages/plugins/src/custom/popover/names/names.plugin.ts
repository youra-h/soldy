import type { IPopover } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/** TPopoverNamesPlugin — имя кнопки закрытия поповера от локали: в `closeAria`. */
export class TPopoverNamesPlugin extends TNamesPlugin<IPopover> {
	protected override _name(owner: IPopover, translations: TTranslations): void {
		owner.closeAria.add('aria-label', translations.popover.close)
	}
}
