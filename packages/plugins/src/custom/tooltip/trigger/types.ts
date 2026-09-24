import type { TPluginEvents } from '../../../base'

export type TTooltipTriggerPluginEvents = TPluginEvents

/**
 * Подсказка глазами документа (`document-state.ts`): открытую документ умеет
 * только закрыть — когда открывается другая.
 */
export interface ITooltipEntry {
	/** Закрыть подсказку: у неё открылась соседка. */
	close(): void
}

/** Что документ помнит о своих подсказках. */
export type TTooltipDocumentState = {
	/** Открытая подсказка; `null` — открытой нет. */
	open: ITooltipEntry | null
	/**
	 * Таймер окна после закрытия, в которое следующая подсказка показывается
	 * без задержки; `null` — окно прошло.
	 */
	warm: ReturnType<typeof setTimeout> | null
}
