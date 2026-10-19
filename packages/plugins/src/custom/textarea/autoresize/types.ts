import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: высота поля — его инлайновый стиль, а о её
 * причинах — тексте, строках и размере — сообщает владелец.
 */
export type TTextareaAutoresizePluginEvents = TPluginEvents
