import { DialogDescriptor } from '@soldy-ui/setup'
import {
	exposeRoot,
	useAdapter,
	useExpose,
	roleIcon,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
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
	expose: useExpose(),
	setup(props: DialogProps, { emit, expose }: SetupContext) {
		const adapter = createVueAdapterContext(DialogDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выходы `layout_styles`, `layout_backdropStyles` и
		// `dismiss_ownerAttribute` шаблон раскладывает на панель и подложку
		const binding = useAdapter(adapter, props, emit)

		// Корень шаблона — телепорт: `$el` потребителю — панель, а не его якорь
		exposeRoot(expose, binding.rootElement)

		return {
			...binding,
			/**
			 * Инстанс — для кнопок шапки: крестик просит окно закрыться
			 * (`requestClose`), разворот переключает `maximized`. Возврат фокуса
			 * — забота плагина, разметка о нём не знает.
			 */
			dialog: adapter.instance,
			closeIconTag: roleIcon('close'),
			maximizeIconTag: roleIcon('arrowsOutward'),
			restoreIconTag: roleIcon('arrowsInward'),
		}
	},
}
