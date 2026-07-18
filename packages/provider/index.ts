/**
 * @soldy/provider — точка входа
 *
 * Слой адаптации (provider) между core/plugins и UI-фреймворками.
 *
 * Основные концепции:
 * - IContribution — декларация свойств и событий от источника (компонент/плагин)
 * - IComponentModel — immutable DTO, результат компиляции вкладов
 * - IAccessor / IAccessorProvider — абстракция доступа к свойствам
 * - TRuntime — живая система, связывающая модель с провайдерами
 */

export * from './contract'
export * from './compiler'
export * from './runtime'
export * from './contributions'
export * from './providers'
