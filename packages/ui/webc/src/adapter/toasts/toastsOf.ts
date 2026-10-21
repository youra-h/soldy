import type { IToastsApi } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { createWebcElevator } from '../elevator'
import type { TToastRender } from './types'

/**
 * API тостов ближайшего `<so-toasts>` выше узла:
 * `toastsOf(button).show('Сохранено')` — как `useToasts()` у Vue и Svelte.
 *
 * Менеджер опускает API лифтом (`TToastsApiExtension`) своему элементу, и
 * здесь он берётся тем же лифтом — контекстом места: ближайшее значение выше
 * узла, сам узел не в счёт, — поэтому у самого `<so-toasts>` API нет, его
 * берут у узла внутри. Узел внутри увезённой панели — окна, поповера,
 * региона тостов — ищет от её якоря, поэтому кнопка в окне находит менеджер
 * вокруг места окна, а не вокруг `body`. Контекста компонента, как у
 * фреймворков, у платформы нет, и место называет узел — тот, откуда зовут:
 * кнопка в обработчике своего клика. `show` — поле со стрелкой:
 * деструктуризация не теряет `this`.
 *
 * Своё содержимое (`render`) здесь типизировано функцией, которая получает тост
 * и отдаёт узел: ядро значение не читает, и тип ему даёт адаптер.
 *
 * Менеджера выше нет — ошибка: тост показать негде, и молчаливый `show`,
 * который ничего не делает, спрятал бы забытый `<so-toasts>`.
 */
export function toastsOf(node: Element): IToastsApi<TToastRender> {
	const api = createWebcElevator(node)(TOASTS_ELEVATOR).up()

	if (!api) {
		throw new Error(
			'toastsOf(): выше узла нет <so-toasts>. Оберните приложение менеджером и зовите toastsOf у узла внутри него: <so-toasts>…</so-toasts>',
		)
	}

	return api
}
