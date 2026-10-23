import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { SwitchProps } from './base.component'

/** Поле формы `Field` над переключателем: ошибку и ссылки на части берёт от него лифтом. */
export function useSetupSwitch(props: SwitchProps) {
	return useComponent(
		(create, elevator) =>
			create(SwitchDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
				elevator,
			}),
		props,
	)
}
