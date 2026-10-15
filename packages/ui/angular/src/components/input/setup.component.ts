import { InputDescriptor } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupInput — setup-слой Input: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: текст в ядро несёт плагин ввода по `input` поля, имя
 * кнопки очистки (`clearAria`) пишет плагин имён формы по локали поддерева.
 */
export function setupInput(ctrl: IInput | undefined, props: object): TBinding<IInput> {
	const adapter = createAngularAdapterContext(InputDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
