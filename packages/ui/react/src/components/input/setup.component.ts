/**
 * useSetupInput — setup-слой Input (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(InputDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части поле берёт от
 * него своим расширением (`TFieldControlExtension`) лифтом компонента. Своему
 * содержимому — слотам — оно опускает пустую связку: контролы в слотах поля —
 * его содержимое. Детям слой лифта (`layer`) отдаёт `Elevate` в разметке.
 */

import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { InputProps } from './base.component'

export function useSetupInput(props: InputProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(InputDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
