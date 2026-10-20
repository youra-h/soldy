/**
 * setupDialog — setup-слой Dialog.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, слой и размер в стилях — `TDialogLayoutPlugin`.
 * Разметка раскладывает то, что отдали ядро и плагины: выходы
 * `layout_styles` и `dismiss_ownerAttribute` — на панель,
 * `layout_backdropStyles` — на подложку.
 */

import { DialogDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { DialogProps } from './base.component'

export function setupDialog(getProps: () => DialogProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(DialogDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
