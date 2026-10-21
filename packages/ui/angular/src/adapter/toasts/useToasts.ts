import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { TAngularElevator } from '../elevator'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<div so-toasts>` выше по дереву:
 *
 * ```ts
 * export class SaveButton {
 * 	private readonly toasts = useToasts()
 *
 * 	save(): void {
 * 		this.toasts.show({ text: 'Сохранено', type: 'success' })
 * 	}
 * }
 * ```
 *
 * Менеджер опускает API лифтом (`TToastsApiExtension`) в свой слой, и здесь он
 * берётся тем же лифтом — чтением «позже» (`TAngularElevator.upLater`): слой
 * над компонентом — при вызове, в контексте инъекции, как `inject`, поэтому
 * звать `useToasts()` можно только там — в поле или конструкторе компонента
 * под менеджером. А API из слоя читается на каждый `show`: компонент
 * приложения, написанный прямо в `<div so-toasts>`, Angular создаёт раньше,
 * чем зовёт `ngOnInit` менеджера, где сборка опускает API, — в конструкторе
 * его в слое ещё нет. DI идёт по дереву объявлений, а не по DOM, поэтому API
 * находит и компонент в окне или выезжающей панели под менеджером, и своё
 * содержимое тоста. `show` — поле со стрелкой: деструктуризация не теряет
 * `this`.
 *
 * API — очередь движка менеджера, а не своя: `show` отдаёт её `show`, и тост в
 * ответ — экземпляр ядра, тот же, что у кода с движком (`engine`).
 *
 * Своё содержимое (`render`) здесь типизировано компонентом Angular со входом
 * `toast` (`TToastRender`): ядро значение не читает, и тип ему даёт адаптер.
 *
 * Менеджера выше нет — `show` бросает ошибку: тост показать негде, и
 * молчаливый `show`, который ничего не делает, спрятал бы забытый
 * `<div so-toasts>`.
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
