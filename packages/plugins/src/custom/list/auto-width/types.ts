/** Что плагину нужно от владельца: только набор классов. */
export interface IListAutoWidthOwner {
	readonly classes: { toggle(entry: string, value: boolean, withBase?: boolean): unknown }
}
