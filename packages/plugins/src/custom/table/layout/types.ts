import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: место он отдаёт расширению колонок, а что из
 * него вышло — ширины колонок и `data-overflow` таблицы — сообщают они.
 * Второй путь к тем же фактам через события плагина разошёлся бы с первым.
 */
export type TTableLayoutPluginEvents = TPluginEvents
