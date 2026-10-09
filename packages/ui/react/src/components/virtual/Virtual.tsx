import type { ReactElement } from 'react'
import { Elevate, renderSlot } from '../../adapter'
import { useSetupVirtual } from './setup.component'
import type { VirtualProps } from './base.component'

/**
 * Virtual — окно для длинных списков: коллекции внутри (ListBox) рисуют только
 * видимые элементы, а на месте остальных — распорки той же высоты.
 * Выключатель — `enabled`.
 *
 * Своего узла у обёртки нет, как у Vue: разметка — только дети, в слое лифта
 * обёртки (`Elevate`). По нему проводка обёртки опускает коллекциям подключение
 * к окну, а коллекция подхватывает его своей сборкой. Пересобранная обёртка
 * (StrictMode, `<Activity>`) опускает новое подключение, и коллекция
 * пересобирается вслед за ней: сменилось прочитанное через лифт.
 */
export function Virtual(props: VirtualProps): ReactElement {
	const { layer } = useSetupVirtual(props)

	return <Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
}
