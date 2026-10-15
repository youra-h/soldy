import { EventEmitter } from '@angular/core'
import { TSurface } from '@soldy-ui/setup'
import { AngularProfile } from '@soldy-ui/angular'
import type { TComponentEntry, TPreviewEventSink } from '@soldy-ui/playground-shared'

/** Слушатель выхода компонента: имя выхода и обработчик. */
export type TOutputListener = {
	readonly output: string
	readonly listener: (value: unknown) => void
}

/**
 * Слушатели всех событий компонента — в Angular.
 *
 * Список — поверхность компонента в профиле Angular (`TSurface`): свои события
 * и триггеры пропов, у коллекций — ещё и фасада. По ней же адаптер объявляет
 * выходы компонента, поэтому слушатель есть ровно у того, что компонент
 * объявил. Добавили событие — оно появится на стенде само.
 *
 * Имя выхода — имя Angular (`changeText`), а приёмник получает полное имя
 * ядра (`change:text`): журнал сценария и консоль страницы одни на все
 * фреймворки. Аргумент — то, что получил потребитель выхода: первый аргумент
 * события ядра, его выход и шлёт. `update:<prop>` — v-model Vue, в Angular его
 * нет.
 */
export function listenersOf(
	entry: TComponentEntry,
	sink: TPreviewEventSink,
): readonly TOutputListener[] {
	const descriptors = [
		entry.descriptor(),
		...(entry.collectionDescriptor ? [entry.collectionDescriptor()] : []),
	]

	return descriptors.flatMap((descriptor) =>
		TSurface.of(descriptor, AngularProfile).events.map(({ name, exportName }) => ({
			output: exportName,
			listener: (value: unknown) => sink(name.getName(), [value]),
		})),
	)
}

/**
 * Подписать слушателей на выходы компонента — как привязки `(changeText)` в
 * шаблоне потребителя. Выход у адаптера — геттер, и эмиттер заводит его первое
 * чтение. Выхода, объявленного поверхностью, у компонента нет — это расхождение
 * адаптера с дескриптором, и оно не глушится. Отдаёт отписку.
 */
export function listen(component: object, listeners: readonly TOutputListener[]): () => void {
	const subscriptions = listeners.map(({ output, listener }) => {
		const emitter: unknown = Reflect.get(component, output)

		if (!(emitter instanceof EventEmitter)) {
			throw new Error(`[playground] у ${component.constructor.name} нет выхода «${output}»`)
		}

		return emitter.subscribe(listener)
	})

	return () => {
		for (const subscription of subscriptions) subscription.unsubscribe()
	}
}
