/**
 * @soldy/provider — точка входа
 *
 * Слой адаптации (provider) между core/plugins и UI-фреймворками.
 *
 * Основные концепции:
 * - IContribution — чистое описание свойств и событий (без идентификации источника)
 * - IComponentModel — immutable DTO, результат компиляции вкладов
 * - IComponentDescriptor — единый источник истины: консолидирует Contribution + Provider + Constructor + Plugins
 * - IAccessor / IAccessorProvider — абстракция доступа к свойствам
 * - TRuntime — живая система, связывающая модель с провайдерами
 */

export * from './contract'
export * from './compiler'
export * from './runtime'
export * from './descriptor'
