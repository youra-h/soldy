import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { InputProps } from './base.component'

/** Поле формы `Field` над полем: ошибку и ссылки на части поле берёт от него лифтом. */
export function useSetupInput(props: InputProps) {
	return useComponent(
		(create, elevator) =>
			create(InputDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
				elevator,
			}),
		props,
	)
}
