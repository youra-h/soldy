/**
 * Web Components-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `element:ready` (как в ядре)
 *           `input`                     → `so-input`
 *
 * Составное имя не преобразуется: двоеточия в именах CustomEvent абсолютно
 * легальны, а совпадение с ядром означает, что при отладке нет мысленного
 * перевода. То же решение, что во Vue.
 *
 * Событие из одного слова получает префикс `so-`: `input` → `so-input`, `show`
 * → `so-show`. Событие уходит `CustomEvent` с хоста и всплывает
 * (`runtime/useAdapter.ts`), а хост — элемент потребителя, и имена событий он
 * делит с браузером: слушатель `input` на элементе поля получал бы и событие
 * ядра, и событие браузера — с другим `detail`, — а форма и прочие предки
 * приняли бы событие ядра за событие браузера. В именах событий DOM двоеточия
 * нет, поэтому совпасть с ними может только имя из одного слова. Префикс — у
 * каждого такого имени, а не только у совпавших со списком событий DOM: списка
 * в адаптере нет (его пришлось бы догонять за браузерами), а пары не рвутся —
 * `so-open` рядом с `so-close`. Префикс тот же, что у имени элемента
 * (`so-button`).
 *
 * Имя строится из `TName.getName()`: своей копии формата `namespace:name`
 * здесь нет — её пришлось бы менять вместе с `getName()`.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming } from '@soldy-ui/setup'

/** Префикс события из одного слова — тот же, что у имени элемента (`so-button`). */
const EVENT_PREFIX = 'so-'

function toEventName(fullName: string): string {
	// Составное имя разводит с событиями DOM двоеточие, одно слово — префикс
	return fullName.includes(':') ? fullName : EVENT_PREFIX + fullName
}

export const WebcNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => toEventName(name.getName()),
}
