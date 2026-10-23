import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { CheckBoxProps } from './base.component'

/** Поле формы `Field` над флажком: ошибку и ссылки на части флажок берёт от него лифтом. */
export function useSetupCheckBox(props: CheckBoxProps) {
	return useComponent(
		(create, elevator) =>
			create(CheckBoxDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
				elevator,
			}),
		props,
	)
}
