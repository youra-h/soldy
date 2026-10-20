/**
 * setupTextarea — setup-слой Textarea.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Логики здесь нет: набранное в значение переносит плагин ввода, высоту по
 * тексту — плагин автороста, текст счётчика пишет плагин имён по локали
 * поддерева, `data-limit` ставит ядро.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части поле берёт от
 * него своим расширением (`TFieldControlExtension`) — из слоя лифта предка
 * (`useElevator`). Слотов у поля нет, и слой лифта детям оно не отдаёт.
 */

import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { TextareaProps } from './base.component'

export function setupTextarea(props: TextareaProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TextareaDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return useAdapter(adapter, props)
}
