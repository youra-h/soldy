/**
 * useSetupTextarea — setup-слой Textarea (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(TextareaDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: набранное в значение переносит плагин ввода, высоту по
 * тексту — плагин автороста, текст счётчика пишет плагин имён, `data-limit`
 * ставит ядро.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части поле берёт от
 * него своим расширением (`TFieldControlExtension`) лифтом компонента. Слотов
 * у поля нет, и слой лифта детям оно не отдаёт.
 */

import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { TextareaProps } from './base.component'

export function useSetupTextarea(props: TextareaProps) {
	const { contexts: adapter } = useAdapterContext((create, elevator) =>
		create(TextareaDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	return useAdapter(adapter, props)
}
