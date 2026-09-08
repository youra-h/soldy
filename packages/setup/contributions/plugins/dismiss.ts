import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Пропсы плагина в разметке — с неймспейсом.
 */
export type TDismissPluginProps = {
	dismiss_enabled?: boolean
	dismiss_ownerAttribute?: Record<string, string>
}

/**
 * `enabled` пишется снаружи: пока панель закрыта, глобальный слушатель не
 * нужен. `ownerAttribute` — вычисляемый: разметка вешает его на
 * телепортированную панель, чтобы нажатие внутри неё не считалось нажатием
 * мимо.
 *
 * Событие `dismiss` выведено наружу: закрывать или нет — решает потребитель,
 * плагин только сообщает.
 */
export const DismissContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS, 'dismiss'],
	props: {
		enabled: { type: Boolean, triggers: ['change:enabled'] },
		/**
		 * Значение постоянное — строится из `uid` владельца. Триггер всё равно
		 * нужен: проп без триггеров адаптер считает pass-through и наружу не
		 * отдаёт. `create` — момент, когда плагин объявлен готовым.
		 */
		ownerAttribute: { type: Object, protected: true, triggers: ['create'] },
	},
})
