import { DrawerDescriptor } from '@soldy-ui/setup'
import {
	exposeRoot,
	extendBinding,
	useAdapter,
	useExpose,
	roleIcon,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseDrawer, { type DrawerProps } from './base.component'

/**
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, жест — `TSwipePlugin`, слой и размер в стилях —
 * `TDrawerLayoutPlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Drawer',
	extends: BaseDrawer,
	expose: useExpose(),
	setup(props: DrawerProps, { emit, expose }: SetupContext) {
		const adapter = createVueAdapterContext(DrawerDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выходы `layout_styles`, `layout_backdropStyles` и
		// `dismiss_ownerAttribute` шаблон раскладывает на панель и подложку
		const binding = useAdapter(adapter, props, emit)

		// Корень шаблона — телепорт: `$el` потребителю — панель, а не его якорь
		exposeRoot(expose, binding.rootElement)

		return extendBinding(binding, {
			/**
			 * Инстанс — для кнопки закрытия: она просит панель закрыться
			 * (`requestClose`). Возврат фокуса — забота плагина, разметка о нём
			 * не знает.
			 */
			drawer: adapter.instance,
			closeIconTag: roleIcon('close'),
		})
	},
}
