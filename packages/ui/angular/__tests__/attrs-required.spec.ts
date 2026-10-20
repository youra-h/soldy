/**
 * Без рендерера адаптера (`provideAttrs()`) компонент с внутренним узлом не
 * собирается: молча он работал бы наполовину — статику разметки база
 * переносит на узел сама, а привязки и слушатели остались бы на корне.
 *
 * Приложение здесь своё, без TestBed: в провайдерах спеков (`providers.ts`)
 * рендерер адаптера подключён всем. Компонент без внутреннего узла — Button —
 * собирается и без него. Провайдер не там, где подменяет рендерер приложения,
 * — в провайдерах маршрута, — тоже ошибка: реестр он даёт, а рендерер не
 * подменяет.
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
	createComponent,
	createEnvironmentInjector,
	provideZonelessChangeDetection,
	type ApplicationRef,
	type EnvironmentInjector,
	type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { TButtonComponent, TInputComponent, TTableComponent, provideAttrs } from '@soldy-ui/angular'

/** Приложение спека — снимается после каждого теста. */
let app: ApplicationRef | undefined

afterEach(() => {
	app?.destroy()
	app = undefined
})

/** Приложение без рендерера адаптера, как его собрал бы потребитель. */
async function bare(): Promise<ApplicationRef> {
	app = await createApplication({ providers: [provideZonelessChangeDetection()] })

	return app
}

/** Собрать компонент в приложении: его элемент Angular строит по первому селектору. */
function assemble(component: Type<unknown>, injector: EnvironmentInjector): HTMLElement {
	const ref = createComponent(component, { environmentInjector: injector })

	ref.changeDetectorRef.detectChanges()

	const element: unknown = ref.location.nativeElement

	if (!(element instanceof HTMLElement)) throw new Error('у компонента нет элемента')

	ref.destroy()

	return element
}

describe('без provideAttrs()', () => {
	it.each([
		['Input', TInputComponent],
		['Table', TTableComponent],
	])('%s бросает ошибку с подсказкой, что подключить и куда', async (_name, component) => {
		const { injector } = await bare()

		expect(() => assemble(component, injector)).toThrow(
			/provideAttrs\(\).*providers приложения \(appConfig\)/,
		)
	})

	it('Button собирается: внутреннего узла у него нет', async () => {
		const { injector } = await bare()

		expect(assemble(TButtonComponent, injector).localName).toBe('button')
	})

	it('provideAttrs() в провайдерах маршрута рендерер не подменяет — ошибка', async () => {
		const { injector } = await bare()
		const route = createEnvironmentInjector([provideAttrs()], injector)

		expect(() => assemble(TInputComponent, route)).toThrow(/provideAttrs\(\)/)

		route.destroy()
	})
})

describe('с provideAttrs()', () => {
	it('Input собирается', async () => {
		app = await createApplication({
			providers: [provideZonelessChangeDetection(), provideAttrs()],
		})

		expect(assemble(TInputComponent, app.injector).localName).toBe('div')
	})
})
