import type { TScrollBehavior } from '@soldy/core'

export type TListLayoutPluginEvents = {
	/** change:maxRows — сколько строк показывать до прокрутки */
	'change:maxRows': (value: number) => void
	/** change:wordWrap — переносить длинный текст элемента или обрезать */
	'change:wordWrap': (value: boolean) => void
	/** change:autoWidth — ширина по содержимому */
	'change:autoWidth': (value: boolean) => void
	/** change:scrollBehavior — как прокручивать к элементу */
	'change:scrollBehavior': (value: TScrollBehavior) => void
}

export type TListLayoutPluginOptions = {
	maxRows?: number
	wordWrap?: boolean
	autoWidth?: boolean
	scrollBehavior?: TScrollBehavior
}
