import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { VueElevatorFactory } from '../elevator'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<Toasts>` выше по дереву: `const { show } = useToasts()`.
 *
 * Менеджер опускает API лифтом (`TToastsApiExtension`), и здесь он берётся тем
 * же лифтом — `inject` Vue, поэтому звать `useToasts()` можно только
 * синхронно в `setup()` компонента под менеджером. `show` — поле со стрелкой:
 * деструктуризация не теряет `this`.
 *
 * Своё содержимое (`render`) здесь типизировано компонентом Vue с пропом
 * `toast`: ядро значение не читает, и тип ему даёт адаптер.
 *
 * Менеджера выше нет — ошибка: тост показать негде, и молчаливый `show`,
 * который ничего не делает, спрятал бы забытый `<Toasts>`.
 */
export function useToasts(): IToastsApi<TToastRender> {
	const api = VueElevatorFactory(TOASTS_ELEVATOR).up()

	if (!api) {
		throw new Error(
			'useToasts(): выше по дереву нет <Toasts>. Оберните приложение менеджером: <Toasts><App /></Toasts>',
		)
	}

	return api
}
