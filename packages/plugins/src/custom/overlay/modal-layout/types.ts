import type { TPluginEvents } from '../../../base'

export type TModalLayoutPluginEvents = TPluginEvents & {
	'change:styles': (styles: Record<string, string | number>) => void
	'change:backdropStyles': (styles: Record<string, string | number>) => void
}

/** Имена переменных размера панели: их читает CSS блока компонента. */
export type TModalLayoutVariables = {
	/** Переменная ширины — `--so-dialog-width` у окна */
	readonly width: string
	/** Переменная высоты — `--so-dialog-height` у окна */
	readonly height: string
}
