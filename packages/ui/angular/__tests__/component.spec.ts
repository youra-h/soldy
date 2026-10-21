/**
 * Component — невизуальный слой TComponent. Разметки у него нет ни в одном
 * адаптере, слотов в описании тоже, и корня нет: в Angular он директива и
 * пишется атрибутом на `<ng-container>`, как провайдер локали. Своего узла и
 * шаблона у директивы нет — на месте контейнера Angular ставит только
 * комментарий-якорь, — а написанное внутри контейнера остаётся разметкой хоста:
 * компонент её не выводит и не прячет.
 */

import { describe, it, expect } from 'vitest'
import { Component, viewChild } from '@angular/core'
import { TComponent, type TPluginEvent } from '@soldy-ui/core'
import { TComponentComponent } from '@soldy-ui/angular'
import { mountHost } from './mount'

@Component({
	standalone: true,
	imports: [TComponentComponent],
	template: `<ng-container so-component [ctrl]="ctrl" (soPluginEvent)="onPluginEvent($event)"
		>текст</ng-container
	>`,
})
class ContentHost {
	readonly ctrl = new TComponent()
	readonly received: TPluginEvent[] = []
	readonly component = viewChild.required(TComponentComponent)

	onPluginEvent(event: TPluginEvent): void {
		this.received.push(event)
	}
}

describe('Component · директива без своего узла', () => {
	it('на <ng-container>: элемента нет, текст внутри — разметка хоста', () => {
		const fixture = mountHost(ContentHost)
		const host: HTMLElement = fixture.nativeElement

		expect(fixture.componentInstance.component()).toBeInstanceOf(TComponentComponent)
		expect(host.children).toHaveLength(0)
		expect(host.textContent).toBe('текст')
	})

	/** Собрана директива на контейнере тем же путём, что компонент на элементе. */
	it('на <ng-container>: собрана над ctrl, выход получает событие ядра', () => {
		const fixture = mountHost(ContentHost)
		const event: TPluginEvent = { name: 'timer:tick', args: [500] }

		fixture.componentInstance.ctrl.events.emit('plugin:event', event)

		expect(fixture.componentInstance.received).toEqual([event])
	})
})
