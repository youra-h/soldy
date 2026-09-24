import { DialogDescriptor } from '@soldy-ui/setup'
import { useAdapter, useIcon, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseDialog, { type DialogProps } from './base.component'

/**
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, слой и размер в стилях — `TDialogLayoutPlugin`.
 * Разметка раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Dialog',
	extends: BaseDialog,
	setup(props: DialogProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(DialogDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return {
			// Выходы `layout_styles`, `layout_backdropStyles` и
			// `dismiss_ownerAttribute` шаблон раскладывает на панель и подложку
			...useAdapter(adapter, props, emit),
			/**
			 * Инстанс — для кнопок шапки: крестик просит окно закрыться
			 * (`requestClose`), разворот переключает `maximized`. Возврат фокуса
			 * — забота плагина, разметка о нём не знает.
			 */
			dialog: adapter.instance,
			closeIconTag: useIcon('close'),
			maximizeIconTag: useIcon('arrowsOutward'),
			restoreIconTag: useIcon('arrowsInward'),
		}
	},
}
