// services/base/container.ts

import type { IService, IServiceContainer, IServiceConstructor } from './types'

export class TServiceContainer implements IServiceContainer {
	private _services = new Map<symbol, IService<any, any>>()

	use<S extends IService<any, any>>(ServiceCtor: IServiceConstructor<any, any, S>): this {
		const service = new ServiceCtor()
		this._services.set(ServiceCtor.namespace, service)

		return this
	}

	get<S extends IService<any, any>>(ctor: IServiceConstructor<any, any, S>): S | undefined
	get(namespace: symbol): IService | undefined
	get<S extends IService<any, any>>(
		ctorOrNamespace: IServiceConstructor<any, any, S> | symbol,
	): S | IService | undefined {
		const key = typeof ctorOrNamespace === 'symbol' ? ctorOrNamespace : ctorOrNamespace.namespace

		return this._services.get(key) as S | undefined
	}

	remove<S extends IService<any, any>>(ServiceCtor: IServiceConstructor<any, any, S>): void {
		const service = this._services.get(ServiceCtor.namespace)

		service?.destroy()

		this._services.delete(ServiceCtor.namespace)
	}
}
