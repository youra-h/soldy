/**
 * setupDrawer — setup-слой Drawer.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента; у панели, увезённой в цель, поиск
 * идёт от её якоря: от неё имя крестика, которое пишет плагин имён) и
 * связывает его с элементом через useAdapter. Логики здесь нет: нажатие мимо —
 * `TDismissPlugin`, фокус, Tab и Escape — `TModalFocusPlugin`, немой фон —
 * `THideOutsidePlugin`, запертая прокрутка — `TScrollLockPlugin` по
 * `locksScroll`, жест — `TSwipePlugin`, слой и размер в стилях —
 * `TDrawerLayoutPlugin`. Шаблон раскладывает то, что отдали ядро и плагины:
 * выходы `layout_backdropStyles` и `dismiss_ownerAttribute` — на подложку и на
 * панель.
 */

import { DrawerDescriptor, type DescriptorPluginOutputs } from '@soldy-ui/setup'
import type { IDrawer } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

/** Выходы плагинов Drawer — их читает шаблон: стиль подложки и пометку панели владельцем. */
export type TDrawerOutputs = DescriptorPluginOutputs<typeof DrawerDescriptor>

export function setupDrawer(
	host: HTMLElement,
	ctrl: IDrawer | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDrawer, unknown, TDrawerOutputs> {
	const adapter = createWebcAdapterContext(host, DrawerDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
