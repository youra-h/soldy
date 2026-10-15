/**
 * Frame в Angular: слой поверх страницы.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<div so-frame>`), и в цель
 * (`body` по умолчанию) уезжает он же — как `<teleport>` у Vue и портал у
 * React. На нём сходится всё: наборы ядра, раскладка плагина (`position`,
 * координаты, `z-index` слоя) и то, что потребитель написал на элементе, —
 * класс, атрибуты, обработчики, стиль. Номер слоя один на два места —
 * `z-index` и `data-layer`, по нему плагины оверлея узнают вложенность.
 *
 * Переносит корень база (`teleportRoot`) — после отрисовки, а на месте
 * оставляет якорь-комментарий. Своего у Angular здесь два: без цели панели
 * нет, но узел остаётся на месте — пустым, скрытым и без классов, наборов и
 * стиля ядра: элемент написал потребитель, — и `rendered=false` его прячет, а
 * не убирает. Место узла ведёт Angular, и панель идёт за ним: место, которое
 * он вынул, не снимая компонента (условная проекция чужого компонента),
 * уводит из цели и её, а вернувшееся — возвращает.
 *
 * Сценарии — те же, что у React и Solid (`frame.spec.tsx`), без серверных:
 * Frame на сервере и после гидратации — в `ssr.server.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Component, TemplateRef, ViewContainerRef, input, signal, viewChild } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TFrame } from '@soldy-ui/core'
import { TPluginBundle, ruRU } from '@soldy-ui/plugins'
import { LocaleProviderDirective, TButtonComponent, TFrameComponent } from '@soldy-ui/angular'
import { TELEPORT_ANCHOR } from '../src/adapter/runtime/teleport'
import { find, mountHost, nextFrame } from './mount'

/** Узел Frame — там, куда его увёл телепорт. */
const frame = () => find(document, '.s-frame', HTMLElement)

/** Узел Frame, которого нет: классов ядра на нём нет, искать его — по селектору. */
const bareFrame = () => find(document, '[so-frame]', HTMLElement)

/** Ни содержимого, ни классов, наборов и стиля ядра: от слоя — только узел потребителя. */
function expectNoPanel(node: HTMLElement): void {
	expect(node.style.display).toBe('none')
	expect(node.textContent).toBe('')
	expect(node.classList.contains('s-frame')).toBe(false)
	expect(node.hasAttribute('data-open')).toBe(false)
	expect(node.hasAttribute('data-layer')).toBe(false)
	expect(node.style.position).toBe('')
	expect(node.style.zIndex).toBe('')
}

/** Якоря телепорта в поддереве — комментарии на месте увезённых корней. */
const anchors = (scope: Node): Comment[] => {
	const walker = document.createTreeWalker(scope, NodeFilter.SHOW_COMMENT)
	const found: Comment[] = []

	while (walker.nextNode()) {
		const node = walker.currentNode

		if (node instanceof Comment && node.data === TELEPORT_ANCHOR) found.push(node)
	}

	return found
}

/** Цели, которые тест положил в документ, — убираются после него. */
const targets: Element[] = []

/** Цель с `id` в конце `body`. */
function addTarget(id: string): HTMLElement {
	const target = document.createElement('section')

	target.id = id
	document.body.append(target)
	targets.push(target)

	return target
}

afterEach(() => {
	for (const target of targets.splice(0)) target.remove()
})

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div so-frame visible>Панель</div>`,
})
class PanelHost {}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div so-frame visible [target]="target()">Панель</div>`,
})
class TargetHost {
	readonly target = signal('#first')
}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<span class="before"></span>
		<div so-frame visible [contained]="contained()">Панель</div>
		<span class="after"></span>`,
})
class ContainedHost {
	readonly contained = signal(true)
}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div so-frame visible target="#missing" class="app-panel">Панель</div>`,
})
class MissingHost {}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<section class="place">
		@if (shown()) {
			<div so-frame visible class="root"></div>
		}
		@if (wrapped()) {
			<div class="wrap"><div so-frame visible class="nested"></div></div>
		}
	</section>`,
})
class RemovalHost {
	readonly shown = signal(true)
	readonly wrapped = signal(true)
}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div so-frame [visible]="visible()" [rendered]="rendered()"></div>`,
})
class VisibilityHost {
	readonly visible = signal<boolean | undefined>(undefined)
	readonly rendered = signal<boolean | undefined>(undefined)
}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div so-frame [ctrl]="ctrl" (elementReady)="ready.push($event)"></div>`,
})
class CtrlHost {
	readonly ctrl = new TFrame()
	readonly ready: Element[] = []
}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div so-frame visible [x]="10" [y]="20" [width]="300"></div>`,
})
class LayoutHost {}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div
		so-frame
		visible
		class="app-panel"
		data-testid="panel"
		(click)="clicks.push($event)"
	></div>`,
})
class ConsumerHost {
	readonly clicks: Event[] = []
}

@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<div so-frame visible [x]="x()" [style.left]="'1px'" style="color: red"></div>`,
})
class ConsumerStyleHost {
	readonly x = signal(10)
}

@Component({
	standalone: true,
	imports: [TFrameComponent, TButtonComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale">
		<div so-frame visible>
			<button so-button (bundleCreate)="collect($event)"></button>
		</div>
	</div>`,
})
class LocaleHost {
	readonly locale = ruRU
	readonly bundles: TPluginBundle[] = []

	collect(bundle: unknown): void {
		if (bundle instanceof TPluginBundle) this.bundles.push(bundle)
	}
}

/**
 * Чужой компонент, который показывает содержимое по условию: проекцию Angular
 * вынимает из документа и вставляет снова, а компонентов в ней не снимает.
 */
@Component({
	selector: 'app-card',
	standalone: true,
	template: `<article class="card">
		@if (open()) {
			<ng-content />
		}
	</article>`,
})
class CardComponent {
	readonly open = input(true)
}

/** Frame — прямо в проекции карточки: его узел Angular вынимает и вставляет сам. */
@Component({
	standalone: true,
	imports: [TFrameComponent, CardComponent],
	template: `@if (card()) {
		<app-card [open]="open()">
			<div so-frame visible [contained]="contained()">Панель</div>
		</app-card>
	}`,
})
class ProjectionHost {
	readonly card = signal(true)
	readonly open = signal(true)
	readonly contained = signal(false)
}

/** Frame в обёртке-элементе внутри проекции: Angular вынимает обёртку, а с ней и якорь. */
@Component({
	standalone: true,
	imports: [TFrameComponent, CardComponent],
	template: `<app-card [open]="open()">
		<section class="wrap"><div so-frame visible>Панель</div></section>
	</app-card>`,
})
class WrappedProjectionHost {
	readonly open = signal(true)
}

/** Представление с Frame в контейнере: его отсоединяют и вставляют снова, не снимая. */
@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<section class="place">
		<ng-template #panel><div so-frame visible>Панель</div></ng-template>
		<ng-container #outlet />
	</section>`,
})
class DetachHost {
	readonly panel = viewChild.required<TemplateRef<unknown>>('panel')
	readonly outlet = viewChild.required('outlet', { read: ViewContainerRef })
}

/** Обход NG05106: Frame внутри `@for` — не первым узлом элемента, а в обёртке. */
@Component({
	standalone: true,
	imports: [TFrameComponent],
	template: `<section class="list">
		@for (item of items(); track item) {
			<div class="item" [attr.data-item]="item">
				<div so-frame visible>{{ item }}</div>
			</div>
		}
	</section>`,
})
class ListHost {
	readonly items = signal(['a', 'b'])
}

describe('Frame · телепорт', () => {
	it('узел — в body, а не на месте, на месте — якорь', () => {
		const fixture = mountHost(PanelHost)
		const place: HTMLElement = fixture.nativeElement

		expect(frame().parentElement).toBe(document.body)
		expect(place.contains(frame())).toBe(false)
		expect(frame().textContent).toBe('Панель')
		expect(anchors(place)).toHaveLength(1)
	})

	it('target уводит узел в свою цель, смена target — в новую тем же узлом', () => {
		const first = addTarget('first')
		const second = addTarget('second')
		const fixture = mountHost(TargetHost)
		const node = frame()

		expect(node.parentElement).toBe(first)

		fixture.componentInstance.target.set('#second')
		fixture.detectChanges()

		expect(frame()).toBe(node)
		expect(node.parentElement).toBe(second)
		expect(first.children).toHaveLength(0)
		expect(node.style.display).toBe('')
	})

	it('contained — без телепорта: узел на месте, якоря нет', () => {
		const fixture = mountHost(ContainedHost)
		const place: HTMLElement = fixture.nativeElement

		expect(frame().parentElement).toBe(place)
		expect(frame().dataset.contained).toBe('true')
		expect(frame().style.position).toBe('absolute')
		expect(frame().style.left).toBe('')
		expect(frame().style.display).toBe('')
		expect(anchors(place)).toHaveLength(0)
	})

	it('contained на лету: узел возвращается на своё место и уходит обратно', () => {
		const fixture = mountHost(ContainedHost)
		const place: HTMLElement = fixture.nativeElement
		const node = frame()

		fixture.componentInstance.contained.set(false)
		fixture.detectChanges()

		expect(node.parentElement).toBe(document.body)
		expect(node.style.display).toBe('')
		expect(anchors(place)).toHaveLength(1)

		fixture.componentInstance.contained.set(true)
		fixture.detectChanges()

		// Между теми же соседями, что в разметке
		expect(node.parentElement).toBe(place)
		expect(node.previousElementSibling?.className).toBe('before')
		expect(node.nextElementSibling?.className).toBe('after')
		expect(anchors(place)).toHaveLength(0)
		expect(document.querySelectorAll('.s-frame')).toHaveLength(1)

		fixture.componentInstance.contained.set(false)
		fixture.detectChanges()

		expect(frame()).toBe(node)
		expect(node.parentElement).toBe(document.body)
		expect(document.querySelectorAll('.s-frame')).toHaveLength(1)
	})

	/**
	 * Цели нет — панели нет. Убрать элемент потребителя компонент не может:
	 * он стоит на месте пустым и скрытым, с тем, что написал потребитель.
	 */
	it('цели нет — панели нет: узел на месте, пустой и скрытый', () => {
		const fixture = mountHost(MissingHost)
		const place: HTMLElement = fixture.nativeElement
		const node = bareFrame()

		expect(node.parentElement).toBe(place)
		expectNoPanel(node)
		expect(node.classList.contains('app-panel')).toBe(true)
	})

	it('цель пропала — узел возвращается на место, панели больше нет', () => {
		addTarget('first')

		const fixture = mountHost(TargetHost)
		const place: HTMLElement = fixture.nativeElement
		const node = frame()

		expect(node.textContent).toBe('Панель')

		fixture.componentInstance.target.set('#missing')
		fixture.detectChanges()

		expect(bareFrame()).toBe(node)
		expect(node.parentElement).toBe(place)
		expectNoPanel(node)
		expect(anchors(place)).toHaveLength(0)

		// Цель вернулась — панель снова есть, тем же узлом
		fixture.componentInstance.target.set('#first')
		fixture.detectChanges()

		expect(frame()).toBe(node)
		expect(node.style.display).toBe('')
		expect(node.textContent).toBe('Панель')
	})

	it('снятие убирает узел из цели и якорь с места', () => {
		const fixture = mountHost(RemovalHost)
		const host: HTMLElement = fixture.nativeElement
		const place = find(host, '.place', HTMLElement)

		expect(document.body.querySelector(':scope > .root')).not.toBeNull()

		fixture.componentInstance.shown.set(false)
		fixture.detectChanges()

		expect(document.querySelector('.root')).toBeNull()
		expect(anchors(place)).toHaveLength(1)
	})

	/**
	 * Корень представления Angular снимает сам, откуда угодно, а узел, вложенный
	 * в снятый элемент, не трогает: из цели его убирает база.
	 */
	it('снятие элемента вокруг Frame убирает узел из цели', () => {
		const fixture = mountHost(RemovalHost)

		expect(document.body.querySelector(':scope > .nested')).not.toBeNull()

		fixture.componentInstance.wrapped.set(false)
		fixture.detectChanges()

		expect(document.querySelector('.nested')).toBeNull()
	})

	it('снятый хост не оставляет ни узлов, ни якорей', () => {
		const fixture = mountHost(RemovalHost)
		const place: HTMLElement = fixture.nativeElement

		fixture.destroy()

		expect(document.querySelector('.s-frame')).toBeNull()
		expect(anchors(place)).toHaveLength(0)
	})

	/**
	 * Место, которое Angular вынул без снятия компонента, — условная проекция
	 * чужого компонента. Узел Frame — корень проекции: Angular вынимает его
	 * откуда угодно, и из цели тоже, а вставляет — на место. Панель идёт за
	 * местом: место ушло — ушла и она, вернулось — она снова в цели.
	 */
	it('Frame прямо в проекции: закрыли — ни узла, ни якоря, открыли — тот же узел в body', () => {
		const fixture = mountHost(ProjectionHost)
		const host: HTMLElement = fixture.nativeElement
		const { open } = fixture.componentInstance
		const node = frame()

		// Два круга подряд — без лишних якорей и панелей
		for (const round of ['первый', 'второй']) {
			open.set(false)
			fixture.detectChanges()

			expect(node.isConnected, round).toBe(false)
			expect(anchors(document.body), round).toHaveLength(0)

			open.set(true)
			fixture.detectChanges()

			expect(frame(), round).toBe(node)
			expect(node.parentElement, round).toBe(document.body)
			expect(node.style.display, round).toBe('')
			expect(anchors(find(host, '.card', HTMLElement)), round).toHaveLength(1)
			expect(anchors(document.body), round).toHaveLength(1)
			expect(document.querySelectorAll('.s-frame'), round).toHaveLength(1)
		}
	})

	/**
	 * Проекцию, закрытую с самого начала, Angular в документ не вставляет вовсе:
	 * узел ждёт, пока его вставят, и в цель без места не уезжает.
	 */
	it('проекция закрыта с самого начала — узла в документе нет, открыли — узел в цели', () => {
		// Не `mountHost`: первая отрисовка — уже с закрытой проекцией
		const fixture = TestBed.createComponent(ProjectionHost)
		const host: HTMLElement = fixture.nativeElement

		fixture.componentInstance.open.set(false)
		fixture.detectChanges()

		expect(document.querySelector('[so-frame]')).toBeNull()
		expect(anchors(document.body)).toHaveLength(0)

		fixture.componentInstance.open.set(true)
		fixture.detectChanges()

		expect(frame().parentElement).toBe(document.body)
		expect(frame().textContent).toBe('Панель')
		expect(anchors(find(host, '.card', HTMLElement))).toHaveLength(1)
	})

	/**
	 * Узел Frame в обёртке: Angular вынимает обёртку, и якорь уходит из
	 * документа вместе с ней, а узел остался бы в цели. Он уходит к якорю — в
	 * обёртку, — и возвращается в цель, когда обёртку вставили снова.
	 */
	it('Frame в обёртке внутри проекции: закрыли — узла нет, открыли — тот же узел в цели', () => {
		const fixture = mountHost(WrappedProjectionHost)
		const host: HTMLElement = fixture.nativeElement
		const node = frame()

		fixture.componentInstance.open.set(false)
		fixture.detectChanges()

		expect(node.isConnected).toBe(false)
		expect(anchors(document.body)).toHaveLength(0)

		fixture.componentInstance.open.set(true)
		fixture.detectChanges()

		expect(frame()).toBe(node)
		expect(node.parentElement).toBe(document.body)
		expect(anchors(find(host, '.wrap', HTMLElement))).toHaveLength(1)
		expect(anchors(document.body)).toHaveLength(1)
	})

	it('карточку сняли при закрытой проекции — ни узла, ни якоря', () => {
		const fixture = mountHost(ProjectionHost)
		const node = frame()

		fixture.componentInstance.open.set(false)
		fixture.detectChanges()

		fixture.componentInstance.card.set(false)
		fixture.detectChanges()

		expect(node.isConnected).toBe(false)
		expect(document.querySelector('[so-frame]')).toBeNull()
		expect(anchors(document.body)).toHaveLength(0)
	})

	/** Якорь, который место потеряло с проекцией, узел больше не держит. */
	it('contained при закрытой проекции: узел не вернулся к старому якорю, открыли — на месте', () => {
		const fixture = mountHost(ProjectionHost)
		const host: HTMLElement = fixture.nativeElement
		const node = frame()

		fixture.componentInstance.open.set(false)
		fixture.detectChanges()

		fixture.componentInstance.contained.set(true)
		fixture.detectChanges()

		expect(node.isConnected).toBe(false)
		expect(anchors(document.body)).toHaveLength(0)

		fixture.componentInstance.open.set(true)
		fixture.detectChanges()

		expect(node.parentElement).toBe(find(host, '.card', HTMLElement))
		expect(node.style.display).toBe('')
		expect(node.dataset.contained).toBe('true')
		expect(anchors(document.body)).toHaveLength(0)
	})

	/**
	 * Отсоединённое представление живёт без места: узлы его корней Angular
	 * вынимает из документа, и из цели тоже, а компонент не снимает.
	 */
	it('представление отсоединили — узла нет, вставили снова — тот же узел в цели', () => {
		const fixture = mountHost(DetachHost)
		const host: HTMLElement = fixture.nativeElement
		const { outlet, panel } = fixture.componentInstance
		const view = outlet().createEmbeddedView(panel())

		fixture.detectChanges()

		const node = frame()

		expect(node.parentElement).toBe(document.body)

		outlet().detach()
		fixture.detectChanges()

		expect(node.isConnected).toBe(false)
		expect(anchors(document.body)).toHaveLength(0)

		outlet().insert(view)
		fixture.detectChanges()

		expect(frame()).toBe(node)
		expect(node.parentElement).toBe(document.body)
		expect(anchors(find(host, '.place', HTMLElement))).toHaveLength(1)
	})

	/**
	 * Angular вставляет и переставляет узлы `@for` относительно первого узла
	 * представления, и Frame на этом месте роняет его с NG05106. Обёртка-элемент
	 * — первый узел вместо Frame: Angular двигает её, а якорь ездит внутри.
	 */
	it('обход NG05106: Frame в обёртке внутри @for — вставка в начало и перестановка', () => {
		const fixture = mountHost(ListHost)
		const host: HTMLElement = fixture.nativeElement
		const { items } = fixture.componentInstance

		items.set(['c', 'a', 'b'])
		fixture.detectChanges()

		items.set(['b', 'c', 'a'])
		fixture.detectChanges()

		const wraps = Array.from(host.querySelectorAll('.item'))
		const panels = Array.from(document.body.querySelectorAll(':scope > .s-frame'))

		expect(wraps.map((wrap) => wrap.getAttribute('data-item'))).toEqual(['b', 'c', 'a'])
		expect(wraps.map((wrap) => anchors(wrap).length)).toEqual([1, 1, 1])
		expect(panels.map((panel) => panel.textContent).sort()).toEqual(['a', 'b', 'c'])
	})

	/**
	 * DI Angular идёт по дереву объявлений, а не по DOM: компонент в
	 * увезённой панели собирается с локалью провайдера вокруг Frame, а не с
	 * английской.
	 */
	it('содержимое панели — в контексте места: локаль провайдера вокруг Frame', async () => {
		const fixture = mountHost(LocaleHost)
		// Набор объявляется на микрозадаче после сборки
		await Promise.resolve()

		expect(frame().parentElement).toBe(document.body)
		expect(frame().querySelector('.s-button')).not.toBeNull()
		expect(fixture.componentInstance.bundles.map((bundle) => bundle.locale.locale.tag)).toEqual(
			[ruRU.tag],
		)
	})
})

describe('Frame · rendered и visible', () => {
	it('по умолчанию скрыт: узел есть, display: none', () => {
		mountHost(VisibilityHost)

		expect(frame().style.display).toBe('none')
	})

	it('visible показывает узел', () => {
		const fixture = mountHost(VisibilityHost)

		fixture.componentInstance.visible.set(true)
		fixture.detectChanges()

		expect(frame().style.display).toBe('')
	})

	/** Элемент написал потребитель: `rendered=false` его прячет, как у всех корней-хостов. */
	it('rendered=false прячет узел, а не убирает', () => {
		const fixture = mountHost(VisibilityHost)

		fixture.componentInstance.visible.set(true)
		fixture.componentInstance.rendered.set(false)
		fixture.detectChanges()

		expect(frame().parentElement).toBe(document.body)
		expect(frame().style.display).toBe('none')

		fixture.componentInstance.rendered.set(true)
		fixture.detectChanges()

		expect(frame().style.display).toBe('')
	})

	// Открытость для темы пишет слой: по `data-open` она проявляет и гасит
	// панель переходом
	it('data-open идёт за видимостью', () => {
		const fixture = mountHost(CtrlHost)
		const { ctrl } = fixture.componentInstance

		expect(frame().dataset.open).toBe('false')

		ctrl.show()
		fixture.detectChanges()

		expect(frame().dataset.open).toBe('true')

		ctrl.hide()
		fixture.detectChanges()

		expect(frame().dataset.open).toBe('false')
	})

	it('корень в цели связан с TElementPlugin', async () => {
		const fixture = mountHost(CtrlHost)

		await nextFrame()

		expect(fixture.componentInstance.ready).toEqual([frame()])
	})
})

describe('Frame · слой и раскладка', () => {
	it('у показанного style.zIndex равен data-layer', () => {
		mountHost(PanelHost)

		const layer = frame().getAttribute('data-layer')

		expect(layer).not.toBeNull()
		expect(frame().style.zIndex).toBe(layer)
	})

	it('показ через ctrl поднимает слой в обоих местах', () => {
		const fixture = mountHost(CtrlHost)
		const { ctrl } = fixture.componentInstance

		ctrl.show()
		fixture.detectChanges()

		expect(frame().style.display).toBe('')
		expect(frame().style.zIndex).toBe(String(ctrl.zIndex))
		expect(frame().getAttribute('data-layer')).toBe(String(ctrl.zIndex))
	})

	it('position и координаты — из раскладки', () => {
		mountHost(LayoutHost)

		expect(frame().style.position).toBe('fixed')
		expect(frame().style.left).toBe('10px')
		expect(frame().style.top).toBe('20px')
		expect(frame().style.width).toBe('300px')
	})
})

describe('Frame · разметка потребителя', () => {
	it('класс, data-* и (click) — на узле в цели', () => {
		const fixture = mountHost(ConsumerHost)

		expect(frame().parentElement).toBe(document.body)
		expect(frame().classList.contains('s-frame')).toBe(true)
		expect(frame().classList.contains('app-panel')).toBe(true)
		expect(frame().getAttribute('data-testid')).toBe('panel')

		frame().dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(fixture.componentInstance.clicks).toHaveLength(1)
	})

	/**
	 * Координату называет раскладка — свойство за базой: смена `x` пишет `left`
	 * поверх `[style.left]` потребителя. Стиль потребителя под своим именем
	 * база не трогает.
	 */
	it('смена x пишет left поверх [style.left] потребителя, style потребителя остаётся', () => {
		const fixture = mountHost(ConsumerStyleHost)

		expect(frame().style.color).toBe('red')

		fixture.componentInstance.x.set(40)
		fixture.detectChanges()

		expect(frame().style.left).toBe('40px')
		expect(frame().style.position).toBe('fixed')
		expect(frame().style.color).toBe('red')
	})
})
