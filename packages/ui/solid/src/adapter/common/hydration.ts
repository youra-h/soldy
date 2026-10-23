/**
 * Окна гидратации и мемо, которое их переживает: раскладка корня и частей
 * (`root.ts`), ветки и петли (`../runtime/flow.ts`, `KeyedFor`).
 * AGENTS.md (Solid), «Окна гидратации».
 */

import { createEffect, createMemo, createSignal, sharedConfig, type Accessor } from 'solid-js'
import { isServer } from 'solid-js/web'

/**
 * Открыто ли окно гидратации — условие `isHydrating` из `solid-js/web` без
 * узла (сам он не экспортирован). `done` — гидратацию сорвало расхождение или
 * первое делегированное событие, и Solid снова пишет в узлы.
 */
export function hydrating(): boolean {
	return !isServer && Boolean(sharedConfig.context) && !sharedConfig.done
}

/** Метка «ещё не считали»: значение мемо бывает и пустым. */
const UNCOMPUTED = Symbol('uncomputed')

/** Конец окна — один сигнал на документ, как `sharedConfig` у Solid. */
const [hydrationEnd, endHydration] = createSignal<void>(undefined, { equals: false })

function announceHydrationEnd(): void {
	endHydration()
}

/**
 * Мемо, которое переживает окна гидратации: первое значение — `live`, а
 * пересчёт в любом окне читает источники (`track`) и до конца окна отдаёт
 * прежнее. Конец объявляет эффект, заведённый в этом пересчёте: Solid
 * выполняет его, уже сняв контекст гидратации.
 *
 * `track` по умолчанию — сам `live`; петля только читает список, чтобы в окне
 * не строить строк. Вычисление — функция над `source`, а не замыкание: мемо
 * раскладки стоит у каждой строки таблицы.
 */
export function createHeldMemo<S, T>(
	source: S,
	live: (source: S) => T,
	track: (source: S) => unknown = live,
): Accessor<T> {
	return createMemo<T, typeof UNCOMPUTED>((previous) => {
		if (previous === UNCOMPUTED || !hydrating()) return live(source)

		track(source)
		hydrationEnd()
		createEffect(announceHydrationEnd)

		return previous
	}, UNCOMPUTED)
}
