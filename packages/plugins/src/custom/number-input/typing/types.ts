import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: набранное видно в тексте и значении ядра, конец
 * набора — событием ядра `commit`.
 */
export type TNumberInputTypingPluginEvents = TPluginEvents
