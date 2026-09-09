/**
 * Что плагину нужно от элемента: набор `data-*` и собственный `wordWrap`.
 *
 * `wordWrap` у элемента трёхзначен: `undefined` означает «взять у списка», и
 * это не то же самое, что `false`.
 */
export interface IListWordWrapItem {
	readonly dataset?: { add(name: string, value: boolean | string | null | undefined): unknown }
	readonly wordWrap?: boolean
}
