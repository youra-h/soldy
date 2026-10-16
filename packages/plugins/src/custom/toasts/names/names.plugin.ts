import type { IToasts } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/**
 * TToastsNamesPlugin — имя региона тостов от локали: `aria-label` в `aria`
 * владельца, вместе с клавишей, которая ведёт к тостам («Уведомления (F8)»).
 */
export class TToastsNamesPlugin extends TNamesPlugin<IToasts> {
	protected override _name(owner: IToasts, translations: TTranslations): void {
		owner.aria.add('aria-label', translations.toasts.region)
	}
}
