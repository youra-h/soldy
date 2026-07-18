/**
 * @soldy/setup — точка входа
 *
 * Слой настройки: связывает конкретные классы (TComponent, TElementPlugin, ...)
 * с абстрактной системой контрактов provider'а.
 *
 * Структура:
 * - contributions/ — декларации IContribution для core и плагинов
 * - providers/ — реализации IAccessorProvider / IEventProvider для core и плагинов
 */

export * from './contributions'
export * from './providers'
export * from './models'
