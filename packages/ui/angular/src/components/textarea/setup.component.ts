import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ITextarea } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupTextarea — setup-слой Textarea: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: набранное в значение переносит плагин ввода, высоту по
 * тексту — плагин автороста, текст счётчика пишет плагин имён по локали
 * поддерева, `data-limit` ставит ядро.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * над собой, а в свой слой (`provideElevator()` в его `providers`) опускает
 * пустую связку, как Input.
 */
export function setupTextarea(ctrl: ITextarea | undefined, props: object): TBinding<ITextarea> {
	const adapter = createAngularAdapterContext(TextareaDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
