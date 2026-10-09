import type { TPluginEvents } from '../../base'

/**
 * Своих событий у плагина нет: что рисует список, сообщает коллекция —
 * расширение `draw`. Плагин только отдаёт ему замер и элемент с фокусом.
 */
export type TVirtualPluginEvents = TPluginEvents
