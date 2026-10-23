import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { useElevator } from '../elevator'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<Toasts>` — лифтом, поэтому только при
 * инициализации компонента. Нет менеджера — ошибка, а не молчаливый `show`.
 */
export function useToasts(): IToastsApi<TToastRender> {
	const api = useElevator()(TOASTS_ELEVATOR).up()

	if (!api) {
		throw new Error(
			'useToasts(): выше по дереву нет <Toasts>. Оберните приложение менеджером: <Toasts><App /></Toasts>',
		)
	}

	return api
}
