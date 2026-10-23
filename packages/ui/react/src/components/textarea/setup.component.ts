import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { TextareaProps } from './base.component'

/** Поле формы `Field` над полем: ошибку и ссылки на части поле берёт от него лифтом. */
export function useSetupTextarea(props: TextareaProps) {
	return useComponent(
		(create, elevator) =>
			create(TextareaDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
				elevator,
			}),
		props,
	)
}
