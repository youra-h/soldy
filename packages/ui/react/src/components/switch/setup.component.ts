/**
 * useSetupSwitch — setup-слой Switch (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(SwitchDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Поле формы `Field` над переключателем: ошибку, `id` и ссылки на части
 * переключатель берёт от него своим расширением (`TFieldControlExtension`)
 * лифтом компонента. Своему содержимому — слотам ручки — он опускает пустую
 * связку. Детям слой лифта (`layer`) отдаёт `Elevate` в разметке.
 */

import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { SwitchProps } from './base.component'

export function useSetupSwitch(props: SwitchProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(SwitchDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
