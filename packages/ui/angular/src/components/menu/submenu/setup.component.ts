import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
	TCollectionExtension,
	TCollectionItemExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type {
	IMenuSubmenu,
	IMenuSubmenuProps,
	TMenuCollectionFacade,
	TMenuItemCollectionFacade,
} from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Выходы плагинов подменю — их читает шаблон: пометку панели владельцем. */
export type TMenuSubmenuOutputs = DescriptorPluginOutputs<typeof MenuSubmenuDescriptor>

/** Пункт с подменю: пункт меню над ним и меню своих пунктов. */
export function setupMenuSubmenu(
	ctrl: IMenuSubmenu | undefined,
	props: object,
	engine: IMenuSubmenuProps['engine'],
): TBinding<IMenuSubmenu, TMenuItemCollectionFacade, TMenuSubmenuOutputs, TMenuCollectionFacade> {
	const adapter = createAngularAdapterContext(MenuSubmenuDescriptor(), { ctrl, props })
	// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
	const owner = useAdapter(adapter)

	// В меню над ним — пункт
	const item = createAngularAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { adapter, elevator: AngularElevatorFactory })

	// Для своих пунктов — меню
	const menu = createAngularAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item), useCollectionAdapter(menu))
}
