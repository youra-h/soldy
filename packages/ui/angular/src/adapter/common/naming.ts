/**
 * Angular-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `elementReady`
 *           `input`                     → `soInput`
 *
 * Angular-специфика: имена @Output должны быть валидными TS-идентификаторами,
 * поэтому двоеточия и дефисы схлопываются в camelCase. Префикса `on` нет:
 * руководство Angular запрещает его у выходов (`no-output-on-prefix`).
 *
 * Событие из одного слова получает префикс `so`: `input` → `soInput`, `show` →
 * `soShow`. На `(x)="…"` у элемента Angular ставит и подписку на выход `x`
 * директивы, и слушатель события DOM `x` (`listenerInternal`): выход `input`
 * у `<so-input>` слышал бы ещё и всплывшее `input` вложенного поля, и
 * обработчик получал бы два вызова на нажатие. Имена событий DOM — строчные
 * слова, а camelCase составного имени несёт заглавную, поэтому совпасть с
 * событием DOM может только имя из одного слова. Префикс — у каждого такого
 * имени, а не только у совпавших со списком событий DOM: списка в адаптере нет
 * (его пришлось бы догонять за браузерами), а пары не рвутся — `soOpen` рядом
 * с `soClose`. Префикс тот же, что у селектора (`so-input`): имя из одного
 * слова делит пространство имён с событиями DOM.
 *
 * Имя строится из `TName.getName()`: своей копии формата `namespace:name`
 * здесь нет — её пришлось бы менять вместе с `getName()`. Базу имени так же
 * берут Vue и Web Components, только в camelCase её не переводят.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming } from '@soldy-ui/setup'

/** Префикс выхода из одного слова — тот же, что у селектора компонента. */
const OUTPUT_PREFIX = 'so'

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1)
}

function toOutputName(fullName: string): string {
	const [first, ...rest] = fullName.split(/[-:]/).filter(Boolean)

	// Одно слово совпало бы с событием DOM, составное разводит с ним заглавная
	if (rest.length === 0) return OUTPUT_PREFIX + capitalize(first)

	return first + rest.map(capitalize).join('')
}

export const AngularNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => toOutputName(name.getName()),
}
