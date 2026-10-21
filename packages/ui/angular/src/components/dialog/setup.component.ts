import { DialogDescriptor } from '@soldy-ui/setup'
import type { IDialog } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupDialog — setup-слой Dialog: собирает компонент
 * (`createAngularAdapterContext` — с локалью ближайшего провайдера, от неё
 * имена кнопок шапки) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, слой, размер и отступ в стилях — `TDialogLayoutPlugin`,
 * имя от заголовка и описание предупреждения — `TDialogIdsPlugin`, имена кнопок
 * — `TDialogNamesPlugin`. Разметка раскладывает то, что отдали ядро и плагины:
 * выход `layout_backdropStyles` шаблон кладёт на подложку, а
 * `dismiss_ownerAttribute` база — на окно.
 */
export function setupDialog(ctrl: IDialog | undefined, props: object): TBinding<IDialog> {
	const adapter = createAngularAdapterContext(DialogDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
