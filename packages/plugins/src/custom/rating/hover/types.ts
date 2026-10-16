import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: предпросмотр виден через владельца — его
 * `preview` и `change:preview` сообщает он. Второй путь к тому же факту через
 * события плагина разошёлся бы с первым.
 */
export type TRatingHoverPluginEvents = TPluginEvents
