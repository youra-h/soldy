import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { NumberInputProps } from './base.component'

/** Поле формы `Field` над полем: ошибку и ссылки на части поле берёт от него лифтом. */
export function useSetupNumberInput(props: NumberInputProps) {
	return useComponent(
		(create, elevator) =>
			create(NumberInputDescriptor(), { ctrl: props.ctrl, props }).use(
				TFieldControlExtension,
				{ elevator },
			),
		props,
	)
}
