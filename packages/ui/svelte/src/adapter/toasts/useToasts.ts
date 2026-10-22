import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { useElevator } from '../elevator'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<Toasts>` выше по дереву: `const { show } = useToasts()`.
 *
 * Менеджер опускает API лифтом (`TToastsApiExtension`), и здесь он берётся тем
 * же лифтом (`useElevator`) — контекстом Svelte (`getContext`), поэтому звать
 * `useToasts()` можно только при инициализации компонента под менеджером — в
 * его `<script>`, как `getContext`. `show` — поле со стрелкой:
 * деструктуризация не теряет `this`.
 *
 * Своё содержимое (`render`) здесь типизировано компонентом Svelte с пропом
 * `toast`: ядро значение не читает, и тип ему даёт адаптер.
 *
 * Менеджера выше нет — ошибка: тост показать негде, и молчаливый `show`,
 * который ничего не делает, спрятал бы забытый `<Toasts>`.
 */
export function useToasts(): IToastsApi<TToastRender> {
	const elevator = useElevator()
	const api = elevator(TOASTS_ELEVATOR).up()

	if (!api) {
		throw new Error(
			'useToasts(): выше по дереву нет <Toasts>. Оберните приложение менеджером: <Toasts><App /></Toasts>',
		)
	}

	return api
}
