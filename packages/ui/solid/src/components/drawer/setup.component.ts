/**
 * setupDrawer — setup-слой Drawer.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, жест — `TSwipePlugin`, слой и размер в стилях —
 * `TDrawerLayoutPlugin`. Разметка раскладывает то, что отдали ядро и плагины:
 * выходы `layout_styles` и `dismiss_ownerAttribute` — на панель,
 * `layout_backdropStyles` — на подложку.
 */

import { DrawerDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { DrawerProps } from './base.component'

export function setupDrawer(props: DrawerProps) {
	const adapter = createSolidAdapterContext(DrawerDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
