// services/base/service.ts

import type { IService, IServiceContext } from './types'

export abstract class TBaseService<TInstance = any> implements IService<TInstance> {
    abstract readonly name: string
    abstract install(ctx: IServiceContext<TInstance>): void

    destroy(): void {}
}
