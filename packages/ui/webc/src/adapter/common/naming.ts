/**
 * Web Components-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `show`                      → `so:show`
 *           `show:before`               → `so:show:before`
 *           `element:ready`             → `so:element:ready`
 *
 * Имя события — `so:` и полное имя ядра, у каждого события без исключений.
 * Событие уходит `CustomEvent` с хоста и всплывает (`runtime/useAdapter.ts`), а
 * хост — элемент потребителя: имена событий он делит с браузером и со всем, что
 * слушает документ. Префикс отвечает на вопрос «чьё это событие», а не «могло
 * ли имя совпасть с событием DOM», поэтому он стоит у всей категории целиком —
 * `so:show` рядом с `so:show:before` и `so:change:disabled`, — и потребителю не
 * нужно знать, у каких имён он есть. Разделитель — `:`, как между частями
 * имени ядра: двоеточия в именах `CustomEvent` легальны, а после префикса идёт
 * ровно то имя, что видно в отладке ядра. Буквы префикса — те же, что у имени
 * элемента (`so-button`).
 *
 * Имя строится из `TName.getName()`: своей копии формата `namespace:name`
 * здесь нет — её пришлось бы менять вместе с `getName()`.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming } from '@soldy-ui/setup'

/** Префикс каждого события элемента: буквы — как у имени элемента, разделитель — как в имени ядра. */
const EVENT_PREFIX = 'so:'

export const WebcNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => EVENT_PREFIX + name.getName(),
}
