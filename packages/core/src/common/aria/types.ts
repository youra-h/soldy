import type { TAttributesMap } from '../attributes'

/**
 * Набор атрибутов доступности, вычисленный ядром.
 *
 * Почему это делает ядро, хотя DOM ему недоступен. Здесь нет ни одной
 * DOM-операции — только значение, вычисленное из состояния. Ровно так же
 * устроен `classes`: ядро решает, какие классы нужны, а вешает их шаблон.
 * Плагин на эту роль не годится: он пишет атрибуты после монтирования, и в
 * серверной разметке их не окажется.
 *
 * Кроме собственно `aria-*` сюда попадают `role` и `tabindex` — без них
 * ARIA-паттерн не работает: `<div role="button">` без `tabindex` нельзя
 * сфокусировать, а значит и активировать с клавиатуры.
 */
export type TAriaAttributes = TAttributesMap

export type { TAttributesEvents as TAriaEvents } from '../attributes'

/**
 * Теги, у которых есть собственный атрибут `disabled`. На них состояние
 * передаётся им, а не `aria-disabled` — дублировать оба неверно.
 */
export const NATIVE_DISABLED_TAGS = new Set(['button', 'input', 'select', 'textarea', 'fieldset'])

/** Теги, которые фокусируются и активируются сами, без role/tabindex. */
export const NATIVE_BUTTON_TAGS = new Set(['button', 'input'])

/**
 * Теги, у которых есть собственный атрибут `required`. На них состояние
 * передаётся этим атрибутом, а не `aria-required` — дублировать оба неверно.
 * `select` тоже валиден с нативным `required`, но у `TInputControl` он не
 * используется как тег напрямую (см. `TSelect`), поэтому включён на будущее.
 */
export const NATIVE_REQUIRED_TAGS = new Set(['input', 'select', 'textarea'])

/**
 * Теги, у которых есть собственный атрибут `readonly`. `select` в этот
 * список не входит: нативного `readonly` у него нет, браузер его игнорирует.
 */
export const NATIVE_READONLY_TAGS = new Set(['input', 'textarea'])
