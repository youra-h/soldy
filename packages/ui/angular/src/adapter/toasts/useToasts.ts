import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { TAngularElevator } from '../elevator'
import type { TToastRender } from './render'

/**
 * API тостов ближайшего `<div so-toasts>`. Звать в поле или конструкторе
 * компонента под менеджером: слой берётся при вызове, а API — на каждый
 * `show`. Менеджера нет — `show` бросает, чтобы не спрятать забытый менеджер.
 *
 * ```ts
 * private readonly toasts = useToasts()
 * ```
 */
export function useToasts(): IToastsApi<TToastRender> {
	const api = new TAngularElevator<IToastsApi>(TOASTS_ELEVATOR.name).upLater()

	return {
		show: (input) => {
			const toasts = api()

			if (!toasts) {
				throw new Error(
					'useToasts(): выше по дереву нет <div so-toasts>. Оберните приложение менеджером: <div so-toasts><router-outlet /></div>, — и зовите useToasts() в компоненте внутри него',
				)
			}

			return toasts.show(input)
		},
	}
}
