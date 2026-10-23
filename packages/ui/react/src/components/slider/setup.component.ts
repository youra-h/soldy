import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { SliderProps } from './base.component'

/** Поле формы `Field` над ползунком: ошибку и ссылки на части ползунок берёт от него лифтом. */
export function useSetupSlider(props: SliderProps) {
	return useComponent(
		(create, elevator) =>
			create(SliderDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
				elevator,
			}),
		props,
	)
}
