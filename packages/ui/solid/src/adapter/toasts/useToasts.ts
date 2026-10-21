import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { useElevator } from '../elevator'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<Toasts>` выше по дереву: `const { show } = useToasts()`.
 *
 * Менеджер опускает API лифтом (`TToastsApiExtension`) в свой слой, и здесь
 * он берётся тем же лифтом — из слоя, который компонент видит при сборке
 * (`useElevator`): контекст лифта читает адаптерный слой, а не потребитель.
 * Слой Solid читает только при выполнении тела компонента, поэтому звать
 * `useToasts()` можно только в теле компонента под менеджером, как
 * `useContext`. Тело выполняется один раз — и API берётся один раз. `show` —
 * поле со стрелкой: деструктуризация не теряет `this`.
 *
 * Компонент в окне или выезжающей панели под менеджером API тоже находит:
 * содержимое панели собирается под владельцем места, где стоит её телепорт,
 * и слой у него тот же.
 *
 * Своё содержимое (`render`) здесь типизировано компонентом Solid с пропом
 * `toast`: ядро значение не читает, и тип ему даёт адаптер.
 *
 * Менеджера выше нет — ошибка: тост показать негде, и молчаливый `show`,
 * который ничего не делает, спрятал бы забытый `<Toasts>`.
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
