/**
 * useSetupNumberInput — setup-слой NumberInput (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(NumberInputDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: что набирается, решает ядро, правку браузера до него
 * доводит плагин набора, клавиши шага и кнопки шага с удержанием — свои
 * плагины на корне, очищает поле его команда `clear`.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части поле берёт от
 * него своим расширением (`TFieldControlExtension`) лифтом компонента. Своему
 * содержимому — слотам — оно опускает пустую связку: контролы в слотах поля —
 * его содержимое. Детям слой лифта (`layer`) отдаёт `Elevate` в разметке.
 */

import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { NumberInputProps } from './base.component'

export function useSetupNumberInput(props: NumberInputProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(NumberInputDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
