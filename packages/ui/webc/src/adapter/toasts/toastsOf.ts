import type { IToastsApi, IToastsItem } from '@soldy-ui/core'
import { TOASTS_ELEVATOR } from '@soldy-ui/setup'
import { createWebcElevator } from '../elevator'

/** Своё содержимое тоста: функция получает тост и отдаёт узел. Ядро держит его как `unknown`. */
export type TToastRender = (toast: IToastsItem) => Node

/** Проверкой, а не приведением; что функция отдаёт узел — контракт API. */
export function isToastRender(value: unknown): value is TToastRender {
	return typeof value === 'function'
}

/**
 * API тостов ближайшего `<so-toasts>` выше узла, как `useToasts()` у
 * фреймворков: контекста компонента у платформы нет, и место называет узел.
 * Узел в увезённой панели ищет от её якоря. Менеджера нет — ошибка: молчаливый
 * `show` спрятал бы забытый `<so-toasts>`.
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
