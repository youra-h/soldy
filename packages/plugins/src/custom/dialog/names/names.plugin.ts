import type { IDialog } from '@soldy-ui/core'
import { TModalNamesPlugin } from '../../overlay/modal-names'
import type { TTranslations } from '../../../locale/types'

/**
 * TDialogNamesPlugin — имена кнопок окна от локали: закрытия, как у любого
 * модального слоя (`TModalNamesPlugin`), и разворота — в `maximizeAria`.
 *
 * Имя разворота одно на оба состояния: кнопка — переключатель, и состояние
 * она сообщает `aria-pressed`, который пишет само окно.
 */
export class TDialogNamesPlugin extends TModalNamesPlugin<IDialog> {
	protected override _name(owner: IDialog, translations: TTranslations): void {
		super._name(owner, translations)

		owner.maximizeAria.add('aria-label', translations.dialog.maximize)
	}
}
