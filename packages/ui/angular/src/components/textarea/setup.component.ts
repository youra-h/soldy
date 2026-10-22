import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ITextarea } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Поле формы `Field` над полем связывает расширение `TFieldControlExtension`. */
export function setupTextarea(ctrl: ITextarea | undefined, props: object): TBinding<ITextarea> {
	const adapter = createAngularAdapterContext(TextareaDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
