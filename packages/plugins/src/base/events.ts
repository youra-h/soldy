/**
 * События, которые есть у любого плагина по факту наследования от TBasePlugin.
 *
 * `install` и `destroy` наружу не выходят: это внутренняя механика bundle,
 * потребителю компонента она не адресована. Публичное здесь только `create` —
 * момент, начиная с которого плагин существует и на него можно подписаться.
 *
 * Список объявлен здесь, а не собирается где-то в setup, чтобы у плагина
 * был один источник истины о собственных событиях. Каждая plugin-contribution
 * подмешивает его явно:
 *
 *   export const ElementContribution = (): IContribution => ({
 *     events: [...PLUGIN_EVENTS, 'ready', 'removed'],
 *   })
 */
export const PLUGIN_EVENTS = ['create'] as const
