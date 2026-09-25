import { DrawerDescriptor } from '@soldy-ui/setup'
import { useAdapter, useIcon, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseDrawer, { type DrawerProps } from './base.component'

/**
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, жест — `TDrawerSwipePlugin`, слой и размер в стилях —
 * `TDrawerLayoutPlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Drawer',
	extends: BaseDrawer,
	setup(props: DrawerProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(DrawerDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return {
			// Выходы `layout_styles`, `layout_backdropStyles` и
			// `dismiss_ownerAttribute` шаблон раскладывает на панель и подложку
			...useAdapter(adapter, props, emit),
			/**
			 * Инстанс — для кнопки закрытия: она просит панель закрыться
			 * (`requestClose`). Возврат фокуса — забота плагина, разметка о нём
			 * не знает.
			 */
			drawer: adapter.instance,
			closeIconTag: useIcon('close'),
		}
	},
}
