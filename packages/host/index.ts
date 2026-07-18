/**
 * @soldy/host — точка входа
 *
 * Слой адаптации (host) между core/plugins и UI-фреймворками.
 *
 * Основные концепции:
 * - Contribution — декларация свойств и событий от источника (компонент/плагин)
 * - ComponentModel — immutable DTO, результат компиляции вкладов
 * - IAccessor / IAccessorProvider — абстракция доступа к свойствам
 * - TRuntime — живая система, связывающая модель с провайдерами
 */

export * from './contract'
export * from './compiler'
export * from './runtime'
export * from './contributions'
export * from './providers'
