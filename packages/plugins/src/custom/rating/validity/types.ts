import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: ошибку обязательной оценки сообщает поле — его
 * `validity`, `invalid` при отправке формы и `:user-invalid`, — а о её
 * причинах, оценке и обязательности, сообщает владелец.
 */
export type TRatingValidityPluginEvents = TPluginEvents
