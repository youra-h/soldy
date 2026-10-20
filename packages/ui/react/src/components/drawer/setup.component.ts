/**
 * useSetupDrawer — setup-слой Drawer (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(DrawerDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, жест — `TSwipePlugin`, слой и размер в стилях —
 * `TDrawerLayoutPlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 *
 * Корень — панель, и `ref` потребителя получает её от ref корня (`TRootRef`)
 * сам, на месте и в телепорте.
 */

import { DrawerDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { DrawerProps } from './base.component'

export function useSetupDrawer(props: DrawerProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(DrawerDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выходы `layout_styles`, `layout_backdropStyles` и `dismiss_ownerAttribute`
	// разметка раскладывает на панель и подложку
	return useAdapter(adapter, props)
}
