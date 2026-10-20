/**
 * setupTextarea — setup-слой Textarea.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: по ней плагин имён пишет текст
 * счётчика) и связывает его с элементом через useAdapter. Логики здесь нет:
 * текст в ядро несёт плагин ввода, высоту по тексту — плагин автороста, на
 * корень классы и наборы кладёт база элемента, а поле, его `aria`, текст и
 * счётчик ведёт шаблон.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — ближайшую
 * связку вверх по документу, а своему хосту опускает пустую связку, как Input.
 */

import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ITextarea } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupTextarea(
	host: HTMLElement,
	ctrl: ITextarea | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITextarea> {
	const adapter = createWebcAdapterContext(host, TextareaDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
