/**
 * Сборка компонента Angular — то, что общее у всех компонентов адаптера: id
 * монтирования.
 *
 * Id монтирования — номер сборки компонента в его приложении с префиксом
 * `APP_ID` (`createAngularAdapterContext`): набор строит от него `id` частей
 * (`createId`), а не от своего счётчика процесса, который на сервере общий для
 * всех запросов и при гидратации разошёлся бы. Что номера сервера и браузера
 * сходятся, сторожит `ssr.server.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { APP_ID, Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TPluginBundle } from '@soldy-ui/plugins'
import { ButtonDescriptor } from '@soldy-ui/setup'
import { TButtonComponent, createAngularAdapterContext } from '@soldy-ui/angular'
import { announced } from './element-plugin'
import { mountHost } from './mount'

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button (bundleCreate)="collect($event)"></button>
		<button so-button (bundleCreate)="collect($event)"></button>`,
})
class TwoButtonsHost {
	readonly bundles: TPluginBundle[] = []

	collect(bundle: unknown): void {
		if (bundle instanceof TPluginBundle) this.bundles.push(bundle)
	}
}

/** `id` части `part` у наборов двух кнопок, по порядку в разметке. */
async function partIds(): Promise<string[]> {
	const fixture = mountHost(TwoButtonsHost)

	// Набор объявляется на микрозадаче после сборки
	await announced()

	return fixture.componentInstance.bundles.map((bundle) => bundle.createId('part'))
}

describe('id монтирования', () => {
	it('createId набора — не со своего счётчика и у двух монтирований разный', async () => {
		const ids = await partIds()

		// Свой счётчик набора даёт `s-<n>`: им набор берёт, когда адаптер id
		// монтирования не передал
		for (const id of ids) expect(id).not.toMatch(/^s-\d+-part$/)

		expect(new Set(ids).size).toBe(2)
	})

	it('номер сборки в приложении с префиксом APP_ID', async () => {
		TestBed.configureTestingModule({ providers: [{ provide: APP_ID, useValue: 'shop' }] })

		expect(await partIds()).toEqual(['shop-1-part', 'shop-2-part'])
	})

	it('id монтирования, заданный опцией, остаётся за тем, кто его задал', () => {
		const adapter = TestBed.runInInjectionContext(() =>
			createAngularAdapterContext(ButtonDescriptor(), { mountId: 'own' }),
		)

		expect(adapter.bundle?.createId('part')).toBe('own-part')

		adapter.destroy()
	})
})
