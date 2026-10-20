/**
 * Angular-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `input`                     → `soInput`
 *           `show:before`               → `soShowBefore`
 *           `element:ready`             → `soElementReady`
 *
 * Angular-специфика: имена @Output должны быть валидными TS-идентификаторами,
 * поэтому двоеточия и дефисы схлопываются в camelCase. Префикса `on` нет:
 * руководство Angular запрещает его у выходов (`no-output-on-prefix`).
 *
 * Имя выхода — `so` и полное имя ядра в camelCase, у каждого события без
 * исключений. На `(x)="…"` у элемента Angular ставит и подписку на выход `x`
 * директивы, и слушатель события DOM `x` (`listenerInternal`): выходы делят
 * шаблон с событиями DOM, и выход `input` у `<div so-input>` слышал бы ещё и
 * событие `input` вложенного поля. Префикс отвечает на вопрос «чьё это
 * событие», а не «могло ли имя совпасть с событием DOM», поэтому он стоит у
 * всей категории целиком — `(soShow)` рядом с `(soShowBefore)` и
 * `(soChangeValue)`, — и потребителю не нужно знать, у каких имён он есть.
 * Разделитель — тот же, что между частями имени выхода: camelCase. Буквы
 * префикса — те же, что у селектора (`so-input`).
 *
 * Имя строится из `TName.getName()`: своей копии формата `namespace:name`
 * здесь нет — её пришлось бы менять вместе с `getName()`. Базу имени так же
 * берут Vue и Web Components, только в camelCase её не переводят.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming } from '@soldy-ui/setup'

/** Префикс каждого выхода: буквы — как у селектора компонента, разделитель — camelCase. */
const OUTPUT_PREFIX = 'so'

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1)
}

function toOutputName(fullName: string): string {
	return OUTPUT_PREFIX + fullName.split(/[-:]/).filter(Boolean).map(capitalize).join('')
}

export const AngularNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => toOutputName(name.getName()),
}
