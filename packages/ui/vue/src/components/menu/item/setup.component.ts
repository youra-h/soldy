import {
	TCollectionItemExtension,
	MenuItemDescriptor,
	MenuCollectionItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuItem, { type MenuItemProps } from './base.component'

/**
 * Два контекста, как у элемента ListBox: собственный (текст и значение
 * пункта) и коллекционный (вход в коллекцию меню).
 *
 * `context` отдаётся в шаблон явно: нажатие — метод item-адаптера, а рефами
 * методы не пробрасываются.
 */
export default {
	name: '_MenuItem',
	inheritAttrs: false,
	extends: BaseMenuItem,
	expose: useExpose(),
	setup(props: MenuItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			/**
			 * Строка — экземпляр `TItemRow`, которым владеет пункт. Не проп (не
			 * меняется за время жизни пункта), поэтому отдаём инстансом —
			 * `<Button :ctrl="row">` берёт его целиком, как поле Select.
			 */
			row: adapter.instance.row,
			...useSplitAttrs(),
		}
	},
}
