import type { TPluginEvents } from '../../base/types'

export type TElementServiceEvents = TPluginEvents & {
	/**
	 * Узел подключён. Приходит один раз на подключение, через кадр
	 * (`requestAnimationFrame`), и только если к этому кадру узел всё ещё
	 * привязан. Если узел несколько раз сменился до кадра, приходит одно
	 * `ready` — для итогового узла.
	 */
	ready: (element: HTMLElement) => void
	/**
	 * Объявленный узел отключён или заменён. Приходит синхронно и только для
	 * узла, о котором уже было `ready`: события строго чередуются, первым всегда
	 * идёт `ready`. Замена узла — `removed` сразу и `ready` нового через кадр.
	 */
	removed: () => void
}
