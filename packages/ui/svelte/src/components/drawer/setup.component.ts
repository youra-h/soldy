/**
 * setupDrawer — setup-слой Drawer.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, жест — `TSwipePlugin`, слой и размер в стилях —
 * `TDrawerLayoutPlugin`. Разметка раскладывает то, что отдали ядро и плагины:
 * выходы `layout_styles` и `dismiss_ownerAttribute` — на панель,
 * `layout_backdropStyles` — на подложку.
 */

import { DrawerDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { DrawerProps } from './base.component'

export function setupDrawer(getProps: () => DrawerProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(DrawerDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
