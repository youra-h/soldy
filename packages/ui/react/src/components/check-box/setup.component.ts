/**
 * useSetupCheckBox — setup-слой CheckBox (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(CheckBoxDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Поле формы `Field` над флажком: ошибку, `id` и ссылки на части флажок берёт
 * от него своим расширением (`TFieldControlExtension`) лифтом компонента.
 * Своему содержимому — слотам отметки — он опускает пустую связку. Детям слой
 * лифта (`layer`) отдаёт `Elevate` в разметке.
 */

import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function useSetupCheckBox(props: CheckBoxProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(CheckBoxDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
