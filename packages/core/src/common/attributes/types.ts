/**
 * Снимок набора атрибутов — обычный объект для разметки.
 *
 * `null` означает «атрибут не ставить»: адаптеры раскладывают набор спредом
 * (`v-bind="aria"`, `{...aria}`), а там нужен способ убрать атрибут, а не
 * поставить его в пустую строку.
 */
export type TAttributesMap = Record<string, string | null>

export type TAttributesEvents = {
	/** change — набор атрибутов изменился */
	change: () => void
}
