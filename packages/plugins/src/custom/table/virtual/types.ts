import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: что рисует тело, сообщает коллекция —
 * расширение `virtual`. Плагин только отдаёт ему замер и строку с фокусом.
 */
export type TTableVirtualPluginEvents = TPluginEvents
