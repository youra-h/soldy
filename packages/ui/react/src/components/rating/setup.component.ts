import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { RatingProps } from './base.component'

/** Поле формы `Field` над оценкой: ошибку и ссылки на части оценка берёт от него лифтом. */
export function useSetupRating(props: RatingProps) {
	return useComponent(
		(create, elevator) =>
			create(RatingDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
				elevator,
			}),
		props,
	)
}
