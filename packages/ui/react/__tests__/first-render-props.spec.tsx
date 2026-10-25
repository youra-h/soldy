/**
 * Пропсы первого рендера после перерисовок не держит ни одна функция адаптера.
 *
 * Функция, созданная в теле хука, держит всю область его вызова: V8 заводит
 * одну область на все замыкания вызова, и в области хука адаптера лежат
 * пропсы рендера — их ловит эффект входов, а область `useAdapterContext` —
 * фабрику компонента, замкнутую на его пропсы. Эффект с устойчивыми
 * зависимостями хранит очистку первого коммита всё монтирование: `inst`
 * эффекта у React общий для всех рендеров. Так пропсы первого рендера держали
 * две функции — приёмник событий связки (`useExchange`) и очистка эффекта
 * `useAdapterContext`, — и таблица после замены данных держала прежний список
 * строк со всеми записями (benchmarks/table/history.md, «React, пропсы первого рендера в
 * функциях адаптера»). Теперь обе — стрелки в полях объектов классов
 * (`TEventCallbacks`, `TBuilt` в `useAdapterContext`).
 *
 * Без `WeakRef` и `--expose-gc`: `queryObjects` из `node:v8` сам собирает
 * мусор целиком и синхронно считает, сколько объектов класса осталось
 * достижимо. API у Node экспериментальное, и на первый вызов процесс печатает
 * `ExperimentalWarning` — предупреждение процесса, не консоли теста. Маркер —
 * экземпляр класса из спека в пропе, которого дескриптор не знает: его держат
 * только пропсы рендера. У первого рендера класс маркера свой, у следующих —
 * другой, и не наследник первого: `queryObjects` считает объекты по цепочке
 * прототипов. После двух перерисовок React держит пропсы двух последних
 * рендеров — текущего и прошлого (`alternate`), — и маркера первого не держит
 * никто.
 *
 * Сторож — на харнессе, а не на таблице. В dev-сборке React узел дерева
 * хранит `_debugStack` элемента, из которого создан, и при обновлении его не
 * меняет; неотформатированный `Error` держит функции своих кадров, и JSX в
 * стрелке компонента держал бы область его первого рендера. Поэтому JSX здесь
 * — прямо в теле функций модуля, а маркер создаёт функция, которая собирает
 * элемент: ни в стрелках, ни в переменных теста его нет. Таблицу, собранную
 * для продакшена, проверяет снимок кучи `tools/bench-table` (`npm run heap --
 * 500 mounted …`).
 */

import { describe, it, expect } from 'vitest'
import { StrictMode } from 'react'
import type { ReactElement } from 'react'
import { queryObjects } from 'node:v8'
import { ButtonDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../src/adapter/runtime'
import { mount } from './mount'

/** Маркер пропсов первого рендера. */
class FirstRenderMarker {}

/** Маркер пропсов следующих рендеров — не наследник первого. */
class LaterRenderMarker {}

type TMarkerClass = new () => object

type THarnessProps = {
	/** Пропа нет в дескрипторе Button: маркер держат только пропсы рендера. */
	marker: object
}

/**
 * Компонент на хуках адаптера, как компоненты пакета: фабрика замкнута на
 * пропсы рендера, связка получает их целиком. `forwardProps` (в них маркер) в
 * разметку не уходят: атрибута с объектом у узла быть не должно.
 */
function Harness(props: THarnessProps): ReactElement {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(ButtonDescriptor(), { props }),
	)
	const { ref } = useAdapter(adapter, props)

	return <button ref={ref} />
}

/** Элемент харнесса с новым маркером: маркер есть только в его пропсах. */
function harness(Marker: TMarkerClass): ReactElement {
	return <Harness marker={new Marker()} />
}

/** То же под StrictMode: эффекты ставятся дважды, и сборку хук пересобирает. */
function strict(Marker: TMarkerClass): ReactElement {
	return <StrictMode>{harness(Marker)}</StrictMode>
}

/**
 * Монтирование и две перерисовки с новыми пропсами. Отдельной функцией: её
 * кадр к подсчёту уже снят, и временных значений с первым маркером на стеке
 * нет.
 */
function renderThrice(view: (Marker: TMarkerClass) => ReactElement): void {
	const { render } = mount(view(FirstRenderMarker))

	render(view(LaterRenderMarker))
	render(view(LaterRenderMarker))
}

describe('пропсы первого рендера после двух перерисовок недостижимы', () => {
	it('без пересборки', () => {
		renderThrice(harness)

		// Подсчёт видит маркеры теста: пропсы текущего рендера живы
		expect(queryObjects(LaterRenderMarker, { format: 'count' })).toBeGreaterThan(0)
		expect(queryObjects(FirstRenderMarker, { format: 'count' })).toBe(0)
	})

	it('StrictMode: пересобранная сборка', () => {
		renderThrice(strict)

		expect(queryObjects(LaterRenderMarker, { format: 'count' })).toBeGreaterThan(0)
		expect(queryObjects(FirstRenderMarker, { format: 'count' })).toBe(0)
	})
})
