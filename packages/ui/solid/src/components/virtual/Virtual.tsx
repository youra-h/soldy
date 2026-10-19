import type { JSX } from 'solid-js'
import { Elevate, renderSlot } from '../../adapter'
import { setupVirtual } from './setup.component'
import type { VirtualProps } from './base.component'

/**
 * Virtual — окно для длинных списков: коллекции внутри (ListBox, Table)
 * рисуют только видимые элементы, а на месте остальных — распорки той же
 * высоты. Выключатель — `enabled`.
 *
 * Своего узла у обёртки нет, как у Vue и React: разметка — только дети, в
 * слое лифта обёртки (`Elevate`). По нему проводка обёртки опускает коллекциям
 * подключение к окну, а коллекция подхватывает его своей сборкой. Узлы детей
 * Solid создаёт там, где развернули слот, поэтому слот разворачивается внутри
 * `Elevate`: развёрнутый в теле обёртки, он собрал бы коллекции вне её слоя.
 */
export function Virtual(props: VirtualProps): JSX.Element {
	const binding = setupVirtual(props)

	return <Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
}
