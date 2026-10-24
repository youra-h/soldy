import {
	TCollectionItemExtension,
	TMenuRadioItemExtension,
	MenuRadioItemDescriptor,
	MenuCollectionRadioItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuRadioItem, { type MenuRadioItemProps } from './base.component'

/**
 * Два контекста, как у флажка: собственный (текст, значение и группа
 * переключателя) и коллекционный (вход в коллекцию меню и отметка — её
 * выбор). Группу — ближайшую `Menu.RadioGroup` — переключатель берёт
 * проводкой при сборке (`TMenuRadioItemExtension`), до входа в коллекцию.
 *
 * `context` отдаётся в шаблон явно: нажатие — метод item-адаптера, а рефами
 * методы не пробрасываются.
 */
export default {
	name: '_MenuRadioItem',
	inheritAttrs: false,
	extends: BaseMenuRadioItem,
	expose: useExpose(),
	setup(props: MenuRadioItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuRadioItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TMenuRadioItemExtension, { elevator: VueElevatorFactory })

		const itemAdapter = createVueAdapterContext(
			MenuCollectionRadioItemDescriptor(),
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
			/** Строка — экземпляр `TItemRow`, которым владеет переключатель: кнопка берёт его целиком. */
			row: adapter.instance.row,
			...useSplitAttrs(),
		}
	},
}
