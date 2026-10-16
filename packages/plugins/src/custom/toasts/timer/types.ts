import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: истёкшее время видно через тост — он
 * закрывается (`change:open`), а коллекция сообщает об этом `item:close`.
 */
export type TToastsTimerPluginEvents = TPluginEvents

/** Отсчёт одного тоста. */
export type TToastCountdown = {
	/** Сколько тосту осталось, мс */
	remaining: number
	/** Когда отсчёт пошёл (`Date.now()`); `null` — стоит */
	started: number | null
	/** Таймер истечения; `null` — отсчёт стоит */
	timer: ReturnType<typeof setTimeout> | null
}
