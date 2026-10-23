import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { useElevator } from '../elevator'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<Toasts>`: `const { show } = useToasts()`. Берётся
 * лифтом из слоя, который компонент видит в теле, — поэтому зовётся в теле
 * компонента под менеджером. Менеджера нет — ошибка, а не молчаливый `show`.
 */
export function useToasts(): IToastsApi<TToastRender> {
	const api = useElevator().elevator(TOASTS_ELEVATOR).up()

	if (!api) {
		throw new Error(
			'useToasts(): выше по дереву нет <Toasts>. Оберните приложение менеджером: <Toasts><App /></Toasts>',
		)
	}

	return api
}
