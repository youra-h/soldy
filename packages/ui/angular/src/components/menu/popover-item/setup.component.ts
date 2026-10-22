import {
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
	TCollectionItemExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Выходы плагинов пункта с панелью — их читает шаблон: пометку панели владельцем. */
export type TMenuPopoverItemOutputs = DescriptorPluginOutputs<typeof MenuPopoverItemDescriptor>

/**
 * setupMenuPopoverItem — setup-слой пункта с панелью.
 *
 * Два контекста, как у пункта-действия: собственный
 * (`MenuPopoverItemDescriptor` — текст, открытость, наборы панели) и фасада
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню). Своей коллекции у
 * пункта с панелью нет, как и своего слоя лифта: в панели лежит что угодно.
 *
 * Логики здесь нет: стрелка к концу строки — `TMenuPopoverItemKeyboardPlugin`,
 * фокус, Escape и Tab — `TMenuPopoverItemFocusPlugin`, нажатие и уход фокуса
 * мимо — `TDismissPlugin`, координаты панели у строки — `TAnchorPlugin` её
 * Frame, одна открытая панель на меню — коллекция меню.
 */
export function setupMenuPopoverItem(
	ctrl: IMenuPopoverItem | undefined,
	props: object,
): TBinding<IMenuPopoverItem, TMenuItemCollectionFacade, TMenuPopoverItemOutputs> {
	const adapter = createAngularAdapterContext(MenuPopoverItemDescriptor(), { ctrl, props })
	// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
