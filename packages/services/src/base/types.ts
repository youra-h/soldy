// services/base/types.ts — контракты для сервисов

/**
 * Контекст, передаваемый сервису при установке.
 */
export interface IServiceContext<TInstance = any> {
    readonly instance: TInstance
}

/**
 * Сервис — независимая единица логики, устанавливаемая на компонент.
 * Заменяет плагины и коллекции.
 */
export interface IService<TInstance = any> {
    readonly name: string
    install(ctx: IServiceContext<TInstance>): void
    destroy(): void
}

export interface IServiceConstructor<TInstance = any> {
    readonly name: string
    new (): IService<TInstance>
}
