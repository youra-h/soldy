/**
 * setupDialog — setup-слой Dialog.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, слой и размер в стилях — `TDialogLayoutPlugin`.
 * Разметка раскладывает то, что отдали ядро и плагины: выходы
 * `layout_styles` и `dismiss_ownerAttribute` — на панель,
 * `layout_backdropStyles` — на подложку.
 */

import { DialogDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { DialogProps } from './base.component'

export function setupDialog(props: DialogProps) {
	const adapter = createSolidAdapterContext(DialogDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
