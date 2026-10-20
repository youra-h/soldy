/**
 * useSetupDialog — setup-слой Dialog (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(DialogDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin`, слой и размер в стилях — `TDialogLayoutPlugin`.
 * Разметка раскладывает то, что отдали ядро и плагины.
 *
 * Корень окна — панель внутри телепорта, и `ref` потребителя получает её от
 * ref корня (`TRootRef`) сам: открывать корень, как `exposeRoot` у Vue, не
 * нужно.
 */

import { DialogDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { DialogProps } from './base.component'

export function useSetupDialog(props: DialogProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(DialogDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выходы `layout_styles`, `layout_backdropStyles` и `dismiss_ownerAttribute`
	// разметка раскладывает на панель и подложку
	return useAdapter(adapter, props)
}
