import { useContext } from 'react'
import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { ElevatorContext } from '../elevator/layer'
import { TReactElevatorScope } from '../elevator/scope.class'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<Toasts>` выше по дереву: `const { show } = useToasts()`.
 *
 * Менеджер опускает API лифтом (`TToastsApiExtension`) в свой слой, а детям
 * слой отдаёт `Elevate`. Здесь API берётся тем же лифтом: слой — контекстом
 * React, который компонент видит на рендере, значение — `up()` ключа
 * `TOASTS_ELEVATOR` той же фабрикой лифтов, что у сборки
 * (`TReactElevatorScope`). Контекст лифта читает адаптерный слой, а не
 * потребитель. Звать `useToasts()` можно только как хук — в теле компонента
 * под менеджером. Портал React контекст сохраняет, поэтому API находит и
 * компонент в окне или выезжающей панели под менеджером.
 *
 * API — значение контекста: его отдаёт сборка менеджера. Между перерисовками
 * менеджера API тот же объект, а пересобранный менеджер (StrictMode,
 * `<Activity>`) без движка снаружи — это новый движок и новый API, и компонент
 * под ним перерисовывается уже с ним. Поэтому `show`, который зовёт эффект, — в
 * его зависимостях: `useEffect(() => { show('Готово') }, [show])`. Эффект с
 * прежним `show` показал бы тост в движке, которого на экране уже нет.
 *
 * `show` — поле со стрелкой: деструктуризация не теряет `this`. Своё
 * содержимое (`render`) здесь типизировано компонентом React с пропом `toast`:
 * ядро значение не читает, и тип ему даёт адаптер.
 *
 * Менеджера выше нет — ошибка: тост показать негде, и молчаливый `show`,
 * который ничего не делает, спрятал бы забытый `<Toasts>`.
 */
export function useToasts(): IToastsApi<TToastRender> {
	const layer = useContext(ElevatorContext)
	const api = new TReactElevatorScope(layer).elevator(TOASTS_ELEVATOR).up()

	if (!api) {
		throw new Error(
			'useToasts(): выше по дереву нет <Toasts>. Оберните приложение менеджером: <Toasts><App /></Toasts>',
		)
	}

	return api
}
