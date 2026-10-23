import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { DateInputProps } from './base.component'

/** Поле формы `Field` над полем: ошибку и ссылки на части поле берёт от него лифтом. */
export function useSetupDateInput(props: DateInputProps) {
	return useComponent(
		(create, elevator) =>
			create(DateInputDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
				elevator,
			}),
		props,
	)
}
