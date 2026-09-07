import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * `press` — нормализованная активация (клик или Enter/Space, не приходит на
 * disabled), `click` — сырой DOM-клик как есть. Оба нужны: первое одинаково
 * работает на любом теге, второе даёт правду для стороны инстанса.
 */
export const ActionContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS, 'press', 'click', 'focus', 'blur'],
})
