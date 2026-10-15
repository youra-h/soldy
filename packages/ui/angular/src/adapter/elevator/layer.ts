/**
 * Слой лифта — значения, которые владелец отдаёт своему поддереву: свои поверх
 * слоя предка.
 *
 * Провайдеры Angular статичны: токен на ключ лифта пришлось бы объявлять в
 * декораторе каждого владельца заранее, по всем ключам, которые опустит его
 * сборка. Поэтому токен один на слой, как контекст React
 * (`ui/react/src/adapter/elevator/layer.ts`), а ключи живут в слое: владелец
 * подключает свой слой провайдером (`provideElevator()` в `providers`
 * декоратора), а сборка пишет в него и читает из слоя предка.
 *
 * - `write` — в свой слой, своё перекрывает слой предка;
 * - `read` — ключ своего слоя, а нет его — у предка, и так до корня.
 *   Опущенный `null` — тоже значение: им `TVirtualCollectionExtension`
 *   отрезает окно обёртки `Virtual` от списков в слотах своих элементов, и
 *   слой предка за ним уже не читается.
 *
 * Слой нужен `providers`, а не `viewProviders`: его читают и элементы
 * разметки — содержимое владельца, которое написал потребитель, — и элементы
 * из данных в шаблоне владельца. DI Angular идёт по дереву объявлений, а не по
 * DOM, поэтому элемент, спроецированный во владельца, видит слой того
 * владельца, внутри которого его написали.
 *
 * Токен и класс наружу не выходят: пишет и читает слой только лифт
 * (`TAngularElevator`), а владелец берёт его провайдер.
 */

import { InjectionToken, inject, type Provider } from '@angular/core'

export class TElevatorLayer {
	private readonly _own = new Map<symbol, unknown>()

	/** @param _parent слой ближайшего владельца выше; нет его — `null` */
	constructor(private readonly _parent: TElevatorLayer | null) {}

	/** Значение ключа: своё, а нет его — слоя предка. */
	read(key: symbol): unknown {
		return this._own.has(key) ? this._own.get(key) : this._parent?.read(key)
	}

	/** Своё значение ключа — поверх слоя предка. */
	write(key: symbol, value: unknown): void {
		this._own.set(key, value)
	}
}

export const ELEVATOR_LAYER = new InjectionToken<TElevatorLayer>('soldy:elevator')

/**
 * Слой лифта владельца: строка `providers` в его декораторе, как
 * `LocaleProviderDirective` отдаёт поддереву свой источник локали. Слой
 * создаётся при первом обращении — сборкой владельца (`down()`) или
 * элементом, который читает его раньше, — и стоит поверх слоя ближайшего
 * владельца выше (`skipSelf`).
 */
export function provideElevator(): Provider {
	return {
		provide: ELEVATOR_LAYER,
		useFactory: () =>
			new TElevatorLayer(inject(ELEVATOR_LAYER, { skipSelf: true, optional: true })),
	}
}
