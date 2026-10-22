/**
 * Вывод шаблона с инжектором места — `[so-slot-outlet]`.
 *
 * Встроенное представление Angular ищет DI по дереву объявлений: шаблон,
 * выведенный `ngTemplateOutlet`, видит провайдеров того места, где его
 * написали. Слот у Vue, React и Solid рисуется так, будто его написали там,
 * где он выведен, — и директива адаптера выводит шаблон с инжектором своего
 * узла. Так пункты шаблона `item-content` входят в коллекцию подменю, у
 * которого шаблон выведен, а не меню, где его написали (`menu.spec.ts`).
 *
 * Провайдер места — директива-зонд под токеном с именем, читатель — компонент,
 * который рисует имя ближайшего провайдера. Новый контекст директива отдаёт
 * тому же представлению, как `ngTemplateOutlet`: узлы шаблона остаются теми же.
 */

import { describe, it, expect } from 'vitest'
import {
	Component,
	Directive,
	InjectionToken,
	Input,
	forwardRef,
	inject,
	signal,
} from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ComponentFixture } from '@angular/core/testing'
import { SlotOutletDirective } from '@soldy-ui/angular'
import { findIn, mountHost } from './mount'

/** Место — провайдер с именем. */
type TPlace = { readonly name: string }

const PLACE = new InjectionToken<TPlace>('probe:place')

/** Провайдер места: отдаёт поддереву себя, имя — значение атрибута. */
@Directive({
	selector: '[probe-place]',
	standalone: true,
	providers: [{ provide: PLACE, useExisting: forwardRef(() => ProbePlace) }],
})
class ProbePlace implements TPlace {
	@Input({ alias: 'probe-place', required: true }) name = ''
}

/** Читатель: имя ближайшего места — с узла, где стоит, и выше. */
@Component({
	selector: '[probe-reader]',
	standalone: true,
	template: `{{ place?.name ?? 'нет' }}`,
})
class ProbeReader {
	protected readonly place = inject(PLACE, { optional: true })
}

/**
 * Читатель места над собой (`skipSelf`) — так читает слой лифта элемент
 * коллекции (`up()`): владелец внутри шаблона ему ближе места вывода.
 */
@Component({
	selector: '[probe-reader-up]',
	standalone: true,
	template: `{{ place?.name ?? 'нет' }}`,
})
class ProbeReaderUp {
	protected readonly place = inject(PLACE, { skipSelf: true, optional: true })
}

/**
 * Шаблон написан в одном месте, выведен в другом: директивой адаптера и, для
 * сравнения, `ngTemplateOutlet`. Внутри шаблона — свой провайдер с
 * читателями: свой узел и место над собой.
 */
@Component({
	selector: 'probe-slot-outlet',
	standalone: true,
	imports: [NgTemplateOutlet, SlotOutletDirective, ProbePlace, ProbeReader, ProbeReaderUp],
	template: `<div probe-place="объявление">
			<ng-template #content let-text="text">
				<span probe-reader class="probe-flat"></span>
				<b class="probe-text">{{ text }}</b>
				<div probe-place="внутри">
					<span probe-reader class="probe-inner"></span>
					<span probe-reader-up class="probe-inner-up"></span>
				</div>
			</ng-template>
			<ng-template #other><i class="probe-other"></i></ng-template>
		</div>
		<div probe-place="место" class="probe-outlet">
			<ng-container
				[so-slot-outlet]="first() ? content : other"
				[so-slot-outlet-context]="{ text: text() }"
			/>
		</div>
		<div probe-place="вывод" class="probe-template-outlet">
			<ng-container
				[ngTemplateOutlet]="content"
				[ngTemplateOutletContext]="{ text: text() }"
			/>
		</div>`,
})
class OutletPage {
	readonly first = signal(true)
	readonly text = signal('один')
}

/** Узел по селектору внутри вывода директивы. */
const inOutlet = (fixture: ComponentFixture<OutletPage>, selector: string) =>
	findIn(fixture, `.probe-outlet ${selector}`, HTMLElement)

/** Узел по селектору внутри вывода `ngTemplateOutlet`. */
const inTemplateOutlet = (fixture: ComponentFixture<OutletPage>, selector: string) =>
	findIn(fixture, `.probe-template-outlet ${selector}`, HTMLElement)

describe('вывод шаблона с инжектором места', () => {
	it('компонент в шаблоне видит провайдера места вывода, а не места объявления', () => {
		const fixture = mountHost(OutletPage)

		expect(inOutlet(fixture, '.probe-flat').textContent).toBe('место')
		// Сверка не впустую: `ngTemplateOutlet` ведёт DI от места объявления
		expect(inTemplateOutlet(fixture, '.probe-flat').textContent).toBe('объявление')
	})

	/**
	 * Узлы шаблона Angular спрашивает раньше места: владелец внутри шаблона
	 * остаётся своим детям ближе места вывода, и для чтения места над собой
	 * (`skipSelf`) тоже — `skipSelf` действует только на первом узле.
	 */
	it('провайдер внутри шаблона ближе места — и для чтения места над собой', () => {
		const fixture = mountHost(OutletPage)

		expect(inOutlet(fixture, '.probe-inner').textContent).toBe('внутри')
		expect(inOutlet(fixture, '.probe-inner-up').textContent).toBe('внутри')
	})

	it('новый контекст — те же узлы, новый шаблон — новые', () => {
		const fixture = mountHost(OutletPage)
		const page = fixture.componentInstance
		const text = inOutlet(fixture, '.probe-text')
		const reader = inOutlet(fixture, '.probe-flat')

		expect(text.textContent).toBe('один')

		page.text.set('два')
		fixture.detectChanges()

		expect(inOutlet(fixture, '.probe-text')).toBe(text)
		expect(text.textContent).toBe('два')
		expect(inOutlet(fixture, '.probe-flat')).toBe(reader)

		page.first.set(false)
		fixture.detectChanges()

		expect(text.isConnected).toBe(false)
		expect(inOutlet(fixture, '.probe-other')).toBeInstanceOf(HTMLElement)

		page.first.set(true)
		fixture.detectChanges()

		expect(inOutlet(fixture, '.probe-text')).not.toBe(text)
		expect(inOutlet(fixture, '.probe-text').textContent).toBe('два')
		expect(inOutlet(fixture, '.probe-flat').textContent).toBe('место')
	})
})
