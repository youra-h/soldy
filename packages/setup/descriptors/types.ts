/**
 * Типы для ComponentDescriptor — единого источника истины о компоненте.
 *
 * Дескриптор консолидирует: Contribution + Provider + Constructor + Plugins.
 * Заменяет ручную сборку compileComponent([...]) и ручную регистрацию провайдеров.
 */


/** Определение плагина в составе дескриптора.
 * contribution и provider опциональны — если плагин не выставляет пропы наружу,
 * он просто добавляется в bundle без попадания в модель. */
export interface IPluginDefinition {
}

/** Опции для defineComponent(). */
export interface IComponentDescriptorOptions {
}

/**
 * Дескриптор компонента — единственный источник истины.
 * Содержит всё необходимое для создания модели, бандла, провайдера и рантайма.
 */
export interface IComponentDescriptor {
}
