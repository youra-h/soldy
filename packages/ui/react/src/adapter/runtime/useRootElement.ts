/**
 * useRootElement — корень компонента значением рендера: `null` на сервере и до
 * коммита, узел — после.
 *
 * Во Vue корень, привязанный к `TElementPlugin`, — `ref`, и шаблон читает его
 * реактивно: Popover, Tooltip, Menu и Select отдают его своему Frame якорем
 * (`:anchor_anchor="rootElement"`). У React корень приходит только в ref-функцию
 * при коммите, и значением рендера его делает этот хук: подписка на ref корня
 * связки (`binding.root`, `TRootRef`) через `useSyncExternalStore`. Своего
 * хранилища у хука нет — узел держит ref корня, — а React сверяет снимок после
 * подписки сам: корень, привязанный в коммите, перерисовывает компонент уже с
 * узлом, и смена тега отдаёт новый корень так же.
 *
 * Хук зовёт только та разметка, которой корень нужен значением, — а не
 * `useAdapter` у всех: подписка дала бы каждому компоненту лишнюю перерисовку
 * после монтирования. Пересобранный контекст (StrictMode, `<Activity>`)
 * приходит со своим ref корня, и хук переходит на его подписку.
 *
 * На сервере и при гидратации снимок — `null`: ref узлов React там не зовёт, и
 * разметка сервера с первой отрисовкой браузера сходится.
 */

import { useSyncExternalStore } from 'react'
import type { TRootSource } from './root-ref.class'

/** На сервере и при гидратации корня нет. */
const onServer = (): null => null

export function useRootElement(source: TRootSource): Element | null {
	return useSyncExternalStore(source.subscribe, source.getSnapshot, onServer)
}
