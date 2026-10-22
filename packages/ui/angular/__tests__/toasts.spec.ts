/**
 * Toasts под Angular — проводка целиком, на настоящей разметке.
 *
 * Очередь, предел видимых и закрытие проверяет ядро
 * (`core/__tests__/toasts.spec.ts`), отсчёт, удаление, клавиши и жест — плагины;
 * здесь важно, что они сходятся: менеджер оборачивает приложение и отдаёт API
 * тостов лифтом, регион уехал в цель и стоит пустым, тосты рисуются по
 * показанным, слоты пробрасываются, значок — по виду сообщения, а пока тост
 * ждёт, на его месте кольцо, своё содержимое — компонент Angular — получает
 * тост и закрывает его, а закрытый тост уходит из разметки. Сценарии — те же,
 * что у Vue (`ui/vue/__tests__/toasts.spec.ts`); тега вне набора, как у Vue, в
 * Angular нет — элемент чужой коллекции под менеджером здесь радио вне
 * RadioGroup. Слоты — шаблонами, и шаблон непрозрачен: пустой слот тост от
 * заданного не отличает, как сниппет у Svelte.
 *
 * Своё у Angular — обёртка и API. Менеджер — `<div so-toasts>` вокруг
 * приложения, а корень — регион внутри, и в цель уезжает он: у `div` своей
 * коробки нет, а всё, что потребитель на нём написал, — статику, класс, стиль,
 * привязки и слушатели — получает регион. `useToasts()` берёт слой лифта над
 * компонентом при вызове, а API из слоя — на каждый `show`: компонент прямо в
 * `<div so-toasts>` Angular создаёт раньше, чем менеджер опустит API.
 *
 * Раскладку, переходы темы и настоящий указатель jsdom не выполняет — место,
 * стопка, уход и жест мышью — `playground/vue/browser/toasts.spec.ts`, а регион
 * Angular рядом с Vue — `playground/vue/browser/angular-host.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, Input, input, signal, viewChild, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { createEngineRadioGroup, createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, IToastsProps, TToastsItemType, TToastsLayout } from '@soldy-ui/core'
import { TElementPlugin, ruRU } from '@soldy-ui/plugins'
import { getIcon } from '@soldy-ui/setup'
import type { TIconRole } from '@soldy-ui/setup'
import {
	AttributesDirective,
	LocaleProviderDirective,
	SlotDirective,
	TButtonComponent,
	TDialogComponent,
	TPopoverComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TToastsComponent,
	useToasts,
	type TToastRender,
} from '@soldy-ui/angular'
import { TELEPORT_ANCHOR } from '../src/adapter/runtime/teleport'
import { find, nextFrame } from './mount'

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const manager = () => node('[so-toasts]')
const region = () => node('.so-toasts')
const toasts = () => [...document.querySelectorAll<HTMLElement>('.so-toasts-item')]
const texts = () => toasts().map((toast) => node('.so-toasts-item__text', toast).textContent)

/** Тост, который отдал `show`; не показан — тест падает здесь. */
function shown(toast: IToastsItem | undefined): IToastsItem {
	if (!toast) throw new Error('тоста нет')

	return toast
}

/** Приложение под менеджером: API тостов оно берёт полем, как компонент потребителя. */
@Component({
	selector: 'probe-toasts-app',
	standalone: true,
	template: `<main class="so-test-app">Приложение</main>`,
})
class AppProbe {
	readonly toasts = useToasts()
}

/** Своё содержимое тоста — вход сигналом: кнопка «Отменить» закрывает тост. */
@Component({
	selector: 'probe-toasts-undo',
	standalone: true,
	template: `<button class="so-test-undo" [attr.data-uid]="toast().uid" (click)="toast().close()">
		Отменить
	</button>`,
})
class UndoProbe {
	readonly toast = input.required<IToastsItem>()
}

/** Тосты, которые получило своё содержимое со входом декоратором. */
const received: IToastsItem[] = []

/** Своё содержимое тоста — вход декоратором: тоже компонент со входом `toast`. */
@Component({
	selector: 'probe-toasts-note',
	standalone: true,
	template: `<em class="so-test-note">Готово</em>`,
})
class NoteProbe {
	@Input({ required: true }) set toast(value: IToastsItem) {
		received.push(value)
	}
}

/** Второе своё содержимое — для смены `render` у тоста. */
@Component({
	selector: 'probe-toasts-other',
	standalone: true,
	template: `<em class="so-test-other">Другое</em>`,
})
class OtherProbe {
	readonly toast = input.required<IToastsItem>()
}

/**
 * Менеджер вокруг приложения — разметкой, как его пишет потребитель. Входы,
 * которые тест меняет, — сигналы: хост `OnPush`.
 */
@Component({
	selector: 'probe-toasts-page',
	standalone: true,
	imports: [TToastsComponent, AppProbe],
	template: `<div
		so-toasts
		[engine]="engine()"
		[max]="max()"
		[layout]="layout()"
		[rendered]="rendered()"
		[visible]="visible()"
		[target]="target()"
	>
		<probe-toasts-app />
	</div>`,
})
class Page {
	readonly engine = signal<IToastsProps['engine']>(undefined)
	readonly max = signal<number | undefined>(undefined)
	readonly layout = signal<TToastsLayout | undefined>(undefined)
	readonly rendered = signal<boolean | undefined>(undefined)
	readonly visible = signal<boolean | undefined>(undefined)
	readonly target = signal<string | undefined>(undefined)
	readonly app = viewChild.required(AppProbe)
}

/** Слоты тостов — шаблонами менеджера, со scope. */
@Component({
	selector: 'probe-toasts-slots',
	standalone: true,
	imports: [TToastsComponent, AppProbe, SlotDirective],
	template: `<div so-toasts>
		<probe-toasts-app />
		<ng-template slot="item" let-item="item" let-text="text"
			><strong class="so-test-text" [attr.data-uid]="item.uid"
				>{{ text }}!</strong
			></ng-template
		>
		<ng-template slot="item-content" let-item="item"
			><span class="so-test-content">{{ item.text }}</span></ng-template
		>
		<ng-template slot="item-close-icon"><i class="so-test-x"></i></ng-template>
	</div>`,
})
class SlotsPage {
	readonly app = viewChild.required(AppProbe)
}

/** Свой значок — шаблоном `item-icon` со scope `{ item, type }`. */
@Component({
	selector: 'probe-toasts-icon',
	standalone: true,
	imports: [TToastsComponent, AppProbe, SlotDirective],
	template: `<div so-toasts>
		<probe-toasts-app />
		<ng-template slot="item-icon" let-item="item" let-type="type"
			><i class="so-test-icon" [attr.data-uid]="item.uid" [attr.data-type]="type"></i
		></ng-template>
	</div>`,
})
class IconPage {
	readonly app = viewChild.required(AppProbe)
}

/**
 * Всё, что потребитель пишет на `div`: статика, класс, стиль, привязки и
 * слушатель.
 */
@Component({
	selector: 'probe-toasts-consumer',
	standalone: true,
	imports: [TToastsComponent],
	template: `<div
		so-toasts
		class="so-test-mine"
		style="color: red"
		data-test="toasts"
		[class.so-test-dark]="dark()"
		[style.margin-top.px]="offset()"
		[attr.aria-describedby]="described()"
		(click)="clicks.push($event)"
	>
		<main class="so-test-app">Приложение</main>
	</div>`,
})
class ConsumerPage {
	readonly dark = signal(true)
	readonly offset = signal<number | null>(8)
	readonly described = signal<string | null>('hint')
	readonly clicks: Event[] = []
}

/** Менеджер, которого страница снимает. */
@Component({
	selector: 'probe-toasts-removal',
	standalone: true,
	imports: [TToastsComponent, AppProbe],
	template: `<section class="so-test-place">
		@if (shown()) {
			<div so-toasts><probe-toasts-app /></div>
		}
	</section>`,
})
class RemovalPage {
	readonly shown = signal(true)
	readonly app = viewChild.required(AppProbe)
}

/** Компонент без менеджера выше: API он взять может, а показать тост — нет. */
@Component({
	selector: 'probe-toasts-orphan',
	standalone: true,
	template: `<main>Сирота</main>`,
})
class OrphanPage {
	readonly toasts = useToasts()
}

/** Менеджер на `<ng-container>`: узла у контейнера нет. */
@Component({
	selector: 'probe-toasts-container',
	standalone: true,
	imports: [TToastsComponent],
	template: `<ng-container so-toasts><main>Приложение</main></ng-container>`,
})
class ContainerPage {}

/** Радио под менеджером: вне своей группы и в ней. */
@Component({
	selector: 'probe-toasts-radio',
	standalone: true,
	imports: [TToastsComponent, TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-toasts [engine]="engine">
		<label so-radio-group-item value="alone">Одно</label>
		<div so-radio-group [engine]="radios">
			<label so-radio-group-item value="a">В группе</label>
		</div>
	</div>`,
})
class RadioPage {
	readonly engine = createEngineToasts()
	readonly radios = createEngineRadioGroup()
}

/** Регион под провайдером локали: имя региона — от неё. */
@Component({
	selector: 'probe-toasts-locale',
	standalone: true,
	imports: [TToastsComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale">
		<div so-toasts><main>Приложение</main></div>
	</div>`,
})
class LocalePage {
	readonly locale = ruRU
}

/** Компонент в окне под менеджером: окно уехало в `body`, а DI — по дереву объявлений. */
@Component({
	selector: 'probe-toasts-inside',
	standalone: true,
	template: `<button class="so-test-inside">В окне</button>`,
})
class InsideProbe {
	readonly toasts = useToasts()
}

@Component({
	selector: 'probe-toasts-dialog',
	standalone: true,
	imports: [TToastsComponent, TDialogComponent, InsideProbe],
	template: `<div so-toasts>
		<div so-dialog visible><probe-toasts-inside /></div>
	</div>`,
})
class DialogPage {
	readonly inside = viewChild.required(InsideProbe)
}

/** Открытый поповер в приложении под менеджером; `rendered` менеджера — сигналом. */
@Component({
	selector: 'probe-toasts-popover',
	standalone: true,
	imports: [TToastsComponent, TPopoverComponent],
	template: `<div so-toasts [rendered]="rendered()">
		<span so-popover open><button class="so-test-inside">В поповере</button></span>
	</div>`,
})
class PopoverPage {
	readonly rendered = signal<boolean | undefined>(undefined)
}

/**
 * Поповер с триггером в приложении под менеджером; `rendered` менеджера —
 * сигналом, плагин узла региона хост берёт из `(soElementCreate)` менеджера.
 */
@Component({
	selector: 'probe-toasts-trigger',
	standalone: true,
	imports: [
		TToastsComponent,
		TPopoverComponent,
		TButtonComponent,
		SlotDirective,
		AttributesDirective,
	],
	template: `<div so-toasts [rendered]="rendered()" (soElementCreate)="created($event)">
		<button class="so-test-outside">Мимо</button>
		<span so-popover>
			<ng-template
				slot="trigger"
				let-triggerAria="triggerAria"
				let-triggerDataset="triggerDataset"
			>
				<button
					so-button
					text="Открыть"
					class="so-test-trigger"
					[so-attributes]="{ ...triggerAria, ...triggerDataset }"
				></button>
			</ng-template>
			<button class="so-test-inside">В поповере</button>
		</span>
	</div>`,
})
class TriggerPage {
	readonly rendered = signal<boolean | undefined>(undefined)
	/** Плагин узла региона; до объявления набора его нет. */
	region: TElementPlugin | null = null

	created(plugin: unknown): void {
		if (plugin instanceof TElementPlugin) this.region = plugin
	}
}

/** Смонтированный хост теста — его перепроверяют действия. */
let current: ComponentFixture<unknown> | null = null

/** Цели, которые тест положил в документ, — убираются после него. */
const targets: Element[] = []

afterEach(() => {
	current = null
	received.length = 0
	vi.restoreAllMocks()

	for (const target of targets.splice(0)) target.remove()
})

/** Цель с `id` в конце `body`. */
function addTarget(id: string): HTMLElement {
	const target = document.createElement('section')

	target.id = id
	document.body.append(target)
	targets.push(target)

	return target
}

/**
 * Смонтировать хост: проверка изменений уводит регион в цель тем же тактом —
 * перенос идёт после отрисовки, а регион шаблон рисует, когда слой на своём
 * месте. `prepare` задаёт входы до первой отрисовки.
 */
function render<T>(host: Type<T>, prepare?: (page: T) => void): ComponentFixture<T> {
	const fixture = TestBed.createComponent(host)

	current = fixture
	prepare?.(fixture.componentInstance)
	fixture.detectChanges()

	return fixture
}

/** Проверка изменений смонтированного хоста — после смены модели или входа. */
function check(): void {
	current?.detectChanges()
}

/** API тостов приложения под менеджером страницы. */
function apiOf(fixture: { readonly componentInstance: { readonly app: () => AppProbe } }) {
	return fixture.componentInstance.app().toasts
}

/** Якоря телепорта среди детей узла. */
const anchorsIn = (parent: Node) =>
	[...parent.childNodes].filter(
		(child) => child.nodeType === Node.COMMENT_NODE && child.textContent === TELEPORT_ANCHOR,
	)

describe('Toasts · менеджер и API', () => {
	it('приложение — в div, регион уехал в body и стоит пустым, якорь — в div', () => {
		render(Page)

		expect(node('.so-test-app').textContent).toBe('Приложение')
		expect(manager().contains(node('.so-test-app'))).toBe(true)
		expect(region().parentElement).toBe(document.body)
		expect(manager().contains(region())).toBe(false)
		expect(anchorsIn(manager())).toHaveLength(1)
		expect(region().style.display).toBe('')
		expect(toasts()).toEqual([])
	})

	/**
	 * Компонент прямо в `<div so-toasts>` Angular создаёт раньше, чем зовёт
	 * `ngOnInit` менеджера, где сборка опускает API: `useToasts()` в его поле
	 * берёт слой, а API из него — на показ.
	 */
	it('useToasts() в поле компонента прямо в div: show рисует тост, новый — первым', () => {
		const fixture = render(Page)
		const api = apiOf(fixture)

		api.show('Сохранено')
		api.show({ text: 'Отправлено', description: 'Письмо ушло' })
		check()

		expect(texts()).toEqual(['Отправлено', 'Сохранено'])
		expect(node('.so-toasts-item__description', toasts()[0]).textContent).toBe('Письмо ушло')
	})

	it('show без менеджера выше — ошибка с подсказкой', () => {
		const fixture = render(OrphanPage)

		expect(() => fixture.componentInstance.toasts.show('Сохранено')).toThrow(/<div so-toasts>/)
	})

	it('предел видимых: показаны первые max, остальные ждут', () => {
		const fixture = render(Page, (page) => page.max.set(2))
		const api = apiOf(fixture)

		api.show('Первый')
		api.show('Второй')
		api.show('Третий')
		check()

		expect(texts()).toEqual(['Третий', 'Второй'])
	})

	it.each([
		['rendered', (page: Page) => page.rendered.set(false)],
		['visible', (page: Page) => page.visible.set(false)],
	])('%s: false прячет регион, а приложение остаётся на виду', (_prop, hide) => {
		const fixture = render(Page)

		apiOf(fixture).show('Сохранено')
		hide(fixture.componentInstance)
		check()

		expect(region().style.display).toBe('none')
		expect(manager().style.display).toBe('contents')
		expect(node('.so-test-app').textContent).toBe('Приложение')
	})

	/**
	 * `rendered` менеджера снимает регион, а не приложение: у Vue `v-if` стоит
	 * на регионе, а слот с приложением — вне его. Поэтому и слои приложения —
	 * открытая панель поповера в `body` — остаются на виду.
	 */
	it('rendered: false прячет регион, а открытая панель поповера в приложении остаётся на виду', () => {
		const fixture = render(PopoverPage)
		const panel = node('.so-popover__panel')

		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')

		fixture.componentInstance.rendered.set(false)
		check()

		expect(region().style.display).toBe('none')
		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')
	})

	/**
	 * Узла региона у плагинов снятого менеджера нет, как у Vue, где `v-if`
	 * стоит на регионе. А корни приложения остаются: поддерево с приложением
	 * менеджер не снимает, и поповер в нём открывается кликом и закрывается
	 * нажатием мимо — его плагины держат свои узлы.
	 */
	it('rendered: false снимает узел региона, а поповер в приложении открывается и закрывается', async () => {
		const fixture = render(TriggerPage)
		const page = fixture.componentInstance

		await nextFrame()

		expect(page.region?.element).toBe(region())

		page.rendered.set(false)
		check()

		expect(page.region?.element).toBeNull()

		const panel = node('.so-popover__panel')
		const trigger = node('.so-test-trigger')

		expect(panel.style.display).toBe('none')

		trigger.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)
		trigger.focus()
		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
		check()
		await nextFrame()

		expect(panel.style.display).toBe('')
		expect(document.activeElement).toBe(node('.so-test-inside'))

		node('.so-test-outside').dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)
		check()

		expect(panel.style.display).toBe('none')
	})

	/**
	 * DI идёт по дереву объявлений, а не по DOM: компонент в окне, уехавшем в
	 * `body`, видит слой менеджера вокруг места окна и берёт API.
	 */
	it('useToasts() в содержимом окна под менеджером находит API', () => {
		const fixture = render(DialogPage)

		expect(node('.so-dialog').contains(node('.so-test-inside'))).toBe(true)

		shown(fixture.componentInstance.inside().toasts.show('Из окна'))
		check()

		expect(texts()).toEqual(['Из окна'])
	})
})

/**
 * Обёртка без коробки: место в раскладке — у приложения, а внешний узел
 * компонента — регион, как у Vue, у которого обёртки нет вовсе.
 */
describe('Toasts · div и регион', () => {
	it('у div коробки нет; статика, класс и стиль потребителя — на регионе', () => {
		render(ConsumerPage)

		expect(manager().style.display).toBe('contents')
		expect(manager().getAttribute('style')).toBe('display: contents;')
		expect(manager().className).toBe('')
		expect(manager().hasAttribute('data-test')).toBe(false)

		expect(region().classList).toContain('so-test-mine')
		expect(region().classList).toContain('so-toasts')
		expect(region().style.color).toBe('red')
		expect(region().dataset.test).toBe('toasts')
	})

	it('[class.x], [style.x] и [attr.x] — на регионе, смена и снятие — тоже', () => {
		const fixture = render(ConsumerPage)

		expect(region().classList).toContain('so-test-dark')
		expect(region().style.marginTop).toBe('8px')
		expect(region().getAttribute('aria-describedby')).toBe('hint')
		expect(manager().classList).not.toContain('so-test-dark')
		expect(manager().style.marginTop).toBe('')
		expect(manager().hasAttribute('aria-describedby')).toBe(false)

		fixture.componentInstance.dark.set(false)
		fixture.componentInstance.offset.set(null)
		fixture.componentInstance.described.set(null)
		check()

		expect(region().classList).not.toContain('so-test-dark')
		expect(region().classList).toContain('so-test-mine')
		expect(region().style.marginTop).toBe('')
		expect(region().hasAttribute('aria-describedby')).toBe(false)
		expect(manager().style.display).toBe('contents')
	})

	it('слушатель потребителя — на регионе, нажатие в приложении его не зовёт', () => {
		const fixture = render(ConsumerPage)
		const { clicks } = fixture.componentInstance

		node('.so-test-app').click()
		region().click()

		expect(clicks).toHaveLength(1)
		expect(clicks[0]?.target).toBe(region())
	})

	/**
	 * Написанное на контейнере региону не дошло бы: `[class.x]`, `[style.x]` и
	 * `(click)` Angular на нём молча выкидывает. В режиме разработки компонент на
	 * контейнере называет ошибкой сам Angular, а в продакшене — база
	 * (`assertTemplateHost`, «хост без узла» в `attrs.spec.ts`).
	 */
	it('<ng-container so-toasts> — ошибка: у контейнера нет узла', () => {
		expect(() => render(ContainerPage)).toThrow(/"ng-container" tags cannot be used/)
	})

	it('target уводит регион в свою цель; цели нет — региона нет', () => {
		const fixture = render(Page)
		const target = addTarget('so-test-toasts-layer')

		fixture.componentInstance.target.set('#so-test-toasts-layer')
		check()

		expect(region().parentElement).toBe(target)

		fixture.componentInstance.target.set('#so-test-nowhere')
		check()

		expect(document.querySelector('.so-toasts')).toBeNull()
		expect(anchorsIn(manager())).toHaveLength(0)
		expect(node('.so-test-app').textContent).toBe('Приложение')
	})

	it('снятый менеджер уводит регион из цели', () => {
		const fixture = render(RemovalPage)

		apiOf(fixture).show('Сохранено')
		check()

		expect(toasts()).toHaveLength(1)

		fixture.componentInstance.shown.set(false)
		check()

		expect(document.querySelector('.so-toasts')).toBeNull()
		expect(toasts()).toEqual([])
	})
})

describe('Toasts · стопка', () => {
	/** Глубина каждого тоста — переменная, которую разметка отдаёт теме. */
	const depths = () => toasts().map((toast) => toast.style.getPropertyValue('--so-toasts-depth'))

	it('раскладка — модификатор региона: столбец по умолчанию, стопка по входу', () => {
		const fixture = render(Page)

		expect(region().classList.contains('so-toasts--layout-list')).toBe(true)

		fixture.componentInstance.layout.set('cascade')
		check()

		expect(region().classList.contains('so-toasts--layout-cascade')).toBe(true)
		expect(region().classList.contains('so-toasts--layout-list')).toBe(false)
	})

	/**
	 * Петля по `uid` переставляет узлы, а не рисует их заново: переставленный
	 * тост — тот же узел.
	 */
	it('глубина — место в составе; перестановка меняет порядок узлов и глубину, узлы те же', () => {
		const engine = createEngineToasts()
		const fixture = render(Page, (page) => {
			page.engine.set(engine)
			page.layout.set('cascade')
		})
		const api = apiOf(fixture)
		const oldest = shown(api.show('Первый'))

		api.show('Второй')
		api.show('Третий')
		check()

		expect(texts()).toEqual(['Третий', 'Второй', 'Первый'])
		expect(depths()).toEqual(['0', '1', '2'])

		const [third, second, first] = toasts()

		engine.extensions.plain.move(oldest, 0)
		check()

		expect(texts()).toEqual(['Первый', 'Третий', 'Второй'])
		expect(depths()).toEqual(['0', '1', '2'])
		expect(toasts()).toEqual([first, third, second])
	})

	/** Глубина — переменная, а не CSS-свойство `order`: порядок узлов и есть порядок коллекции. */
	it('своего свойства order у тоста нет', () => {
		const fixture = render(Page, (page) => page.layout.set('cascade'))

		apiOf(fixture).show('Первый')
		apiOf(fixture).show('Второй')
		check()

		expect(toasts().map((toast) => toast.style.order)).toEqual(['', ''])
	})

	it('колесо над стопкой листает её: передний уходит назад', async () => {
		const fixture = render(Page, (page) => page.layout.set('cascade'))

		apiOf(fixture).show('Первый')
		apiOf(fixture).show('Второй')
		check()
		// Слушатели стопки встают на регион с его узлом — кадром позже
		await nextFrame()

		const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })

		toasts()[0]?.dispatchEvent(event)
		check()

		expect(event.defaultPrevented).toBe(true)
		expect(texts()).toEqual(['Первый', 'Второй'])
	})
})

/**
 * Менеджер оборачивает приложение, и его коллекция — ближайшая выше почти
 * везде в дереве. Элемент коллекции входит только в коллекцию своего типа:
 * радио вне своей группы под менеджером рисуется само по себе, а не становится
 * тостом и не роняет сборку приложения.
 */
describe('Toasts · элемент чужой коллекции под менеджером', () => {
	it('радио вне RadioGroup рисуется само по себе, тостом не становится', () => {
		const fixture = render(RadioPage)
		const alone = node('.so-radio-group-item')

		expect(alone.textContent).toContain('Одно')
		expect(fixture.componentInstance.engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})

	it('радио в своей группе под менеджером входит в группу', () => {
		const fixture = render(RadioPage)
		const { engine, radios } = fixture.componentInstance

		expect(radios.extensions.batch.items.map((item) => item.value)).toEqual(['a'])
		expect(engine.extensions.batch.items).toEqual([])
	})
})

describe('Toasts · движок снаружи', () => {
	it('тосты, показанные до монтирования, рисуются', () => {
		const engine = createEngineToasts()

		engine.extensions.toasts.show('До монтирования')
		render(Page, (page) => page.engine.set(engine))

		expect(texts()).toEqual(['До монтирования'])
	})

	/** API приложения — очередь того же движка: второго пути к тостам нет. */
	it('код вне компонентов и useToasts() показывают тосты в одну очередь', () => {
		const engine = createEngineToasts()
		const fixture = render(Page, (page) => page.engine.set(engine))
		const toast = shown(apiOf(fixture).show('Из приложения'))

		engine.extensions.toasts.show('Из кода')
		check()

		expect(engine.extensions.batch.items[1]).toBe(toast)
		expect(texts()).toEqual(['Из кода', 'Из приложения'])
	})
})

describe('Toasts · закрытие', () => {
	it('крестик закрывает тост: data-open="false", а после переходов он уходит', async () => {
		const fixture = render(Page)
		const toast = shown(apiOf(fixture).show('Сохранено'))

		check()
		node('.so-toasts-item__close').click()
		check()

		expect(toast.open).toBe(false)
		expect(toasts()[0]?.dataset.open).toBe('false')

		// Переходов в jsdom нет — тост уходит тем же кадром
		await nextFrame()
		check()

		expect(toasts()).toEqual([])
	})

	it('закрытие из кода — тот же путь', async () => {
		const fixture = render(Page)
		const toast = shown(apiOf(fixture).show('Сохранено'))

		check()
		toast.close()
		await nextFrame()
		check()

		expect(toasts()).toEqual([])
	})

	it('без крестика: closable: false', () => {
		const fixture = render(Page)

		apiOf(fixture).show({ text: 'Важно', closable: false })
		check()

		expect(toasts()[0]?.querySelector('.so-toasts-item__close')).toBeNull()
	})
})

describe('Toasts · своё содержимое (render)', () => {
	it('компонент получает тост входом toast, и кнопка внутри закрывает его', () => {
		const fixture = render(Page)
		const undo: TToastRender = UndoProbe
		const toast = shown(apiOf(fixture).show({ text: 'Удалено', render: undo }))

		check()

		const button = node('.so-toasts-item__content .so-test-undo')

		expect(button.textContent?.trim()).toBe('Отменить')
		expect(button.dataset.uid).toBe(String(toast.uid))

		button.click()

		expect(toast.open).toBe(false)
	})

	it('компонент со входом декоратором — тоже содержимое', () => {
		const fixture = render(Page)
		const toast = shown(apiOf(fixture).show({ text: 'Готово', render: NoteProbe }))

		check()

		expect(node('.so-toasts-item__content .so-test-note').textContent).toBe('Готово')
		expect(received).toEqual([toast])
	})

	it('смена render у тоста рисует новое содержимое', () => {
		const fixture = render(Page)
		const toast = shown(apiOf(fixture).show({ text: 'Готово', render: NoteProbe }))

		check()
		toast.render = OtherProbe
		check()

		expect(document.querySelector('.so-test-note')).toBeNull()
		expect(node('.so-toasts-item__content .so-test-other').textContent).toBe('Другое')
	})

	it('без render часть содержимого пуста', () => {
		const fixture = render(Page)

		apiOf(fixture).show('Сохранено')
		check()

		expect(node('.so-toasts-item__content').children).toHaveLength(0)
		expect(node('.so-toasts-item__content').textContent).toBe('')
	})

	/**
	 * Компонент Angular — класс с описанием компонента, и функцию или объект
	 * Angular нарисовать не может: ядро держит `render` как `unknown`, и не
	 * компонент разметка не рисует. Чужое значение приходит кодом вне
	 * компонентов — у API движка тип `render` не сужен.
	 */
	it.each([
		['объект', { component: 'нет' }],
		['функция', () => document.createElement('button')],
		['класс без описания компонента', class {}],
	])('render — %s, а не компонент: часть содержимого пуста', (_case, value) => {
		const engine = createEngineToasts()

		render(Page, (page) => page.engine.set(engine))
		engine.extensions.toasts.show({ text: 'Сохранено', render: value })
		check()

		expect(node('.so-toasts-item__content').children).toHaveLength(0)
	})

	it('без описания часть описания пуста, а текст — нет', () => {
		const fixture = render(Page)

		apiOf(fixture).show('Сохранено')
		check()

		expect(node('.so-toasts-item__description').childNodes).toHaveLength(0)
		expect(node('.so-toasts-item__text').textContent).toBe('Сохранено')
	})
})

describe('Toasts · слоты', () => {
	it('item — текст со scope { item, text }, item-content — своё содержимое', () => {
		const fixture = render(SlotsPage)
		const toast = shown(apiOf(fixture).show('Сохранено'))

		check()

		expect(node('.so-test-text').textContent).toBe('Сохранено!')
		expect(node('.so-test-text').dataset.uid).toBe(String(toast.uid))
		expect(node('.so-toasts-item__content .so-test-content').textContent).toBe('Сохранено')
	})

	/** Новый контекст шаблона вывод отдаёт тому же представлению: узел слота тот же. */
	it('смена текста доходит до слота item тем же узлом', () => {
		const fixture = render(SlotsPage)
		const toast = shown(apiOf(fixture).show('Сохраняем…'))

		check()

		const text = node('.so-test-text')

		toast.text = 'Сохранено'
		check()

		expect(node('.so-test-text')).toBe(text)
		expect(text.textContent).toBe('Сохранено!')
	})

	it('item-close-icon подменяет иконку крестика', () => {
		const fixture = render(SlotsPage)

		apiOf(fixture).show('Сохранено')
		check()

		expect(node('.so-toasts-item__close .so-test-x')).toBeTruthy()
		expect(node('.so-toasts-item__close').querySelector('svg')).toBeNull()
	})

	it('без слотов — свои текст и иконка крестика', () => {
		const fixture = render(Page)

		apiOf(fixture).show('Сохранено')
		check()

		expect(node('.so-toasts-item__text').textContent).toBe('Сохранено')
		expect(find(document, '.so-toasts-item__close svg.so-icon', SVGElement)).toBeTruthy()
	})
})

/**
 * Значок: коробка стоит всегда, в ней значок вида по роли иконки, свой значок
 * из `item-icon` или, пока тост ждёт, бегущее кольцо. Цвет значку даёт тема по
 * модификатору вида — его видно только в браузере
 * (`playground/vue/browser/toasts.spec.ts`).
 */
describe('Toasts · значок', () => {
	/** Коробка значка первого тоста. */
	const iconBox = () => node('.so-toasts-item__icon', toasts()[0])

	/** Содержимое `<svg>` иконки роли так, как его сериализует документ. */
	function bodyOf(role: TIconRole): string {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

		svg.innerHTML = getIcon(role).body

		return svg.innerHTML
	}

	/** Рисунок значка в коробке: содержимое иконки, её единственного ребёнка. */
	function glyph(): string {
		const [icon, ...rest] = iconBox().children

		if (!icon || rest.length > 0) throw new Error('в коробке не один узел')
		if (!icon.classList.contains('so-icon')) throw new Error('в коробке не иконка')

		return icon.innerHTML
	}

	it('коробка стоит всегда, даже без слота, и спрятана от скринридера', () => {
		const fixture = render(Page)

		apiOf(fixture).show('Сохранено')
		check()

		expect(iconBox().getAttribute('aria-hidden')).toBe('true')
	})

	it.each<[TToastsItemType | undefined, TIconRole]>([
		[undefined, 'notification'],
		['info', 'info'],
		['success', 'success'],
		['warning', 'warning'],
		['error', 'error'],
	])('вид %s — значок роли %s', (type, role) => {
		const fixture = render(Page)

		apiOf(fixture).show({ text: 'Сообщение', type })
		check()

		expect(glyph()).toBe(bodyOf(role))
	})

	it('значки пяти видов разные: в принудительных цветах вид различает только глиф', () => {
		const roles: TIconRole[] = ['notification', 'info', 'success', 'warning', 'error']

		expect(new Set(roles.map(bodyOf)).size).toBe(roles.length)
	})

	it('смена вида меняет значок, снятый вид возвращает значок обычного сообщения', () => {
		const fixture = render(Page)
		const toast = shown(apiOf(fixture).show('Сохраняем…'))

		check()
		toast.type = 'success'
		check()

		expect(glyph()).toBe(bodyOf('success'))

		toast.type = undefined
		check()

		expect(glyph()).toBe(bodyOf('notification'))
	})

	it('item-icon подменяет значок и получает { item, type }; смена вида доходит до слота тем же узлом', () => {
		const fixture = render(IconPage)
		const toast = shown(apiOf(fixture).show({ text: 'Нет сети', type: 'error' }))

		check()

		const icon = node('.so-test-icon', iconBox())

		expect(iconBox().children).toHaveLength(1)
		expect(icon.dataset.uid).toBe(String(toast.uid))
		expect(icon.dataset.type).toBe('error')

		toast.type = 'success'
		check()

		expect(node('.so-test-icon', iconBox())).toBe(icon)
		expect(icon.dataset.type).toBe('success')
	})

	it('пока тост ждёт — в коробке одно бегущее кольцо; снятое ожидание возвращает значок', () => {
		const fixture = render(Page)
		const toast = shown(apiOf(fixture).show({ text: 'Сохраняем…', loading: true }))

		check()

		const [ring, ...rest] = iconBox().children

		expect(rest).toEqual([])
		expect(ring?.classList.contains('so-progress-spinner')).toBe(true)
		expect(ring?.getAttribute('data-indeterminate')).toBe('true')

		toast.loading = false
		toast.type = 'success'
		check()

		expect(glyph()).toBe(bodyOf('success'))
	})

	it('кольцо встаёт и на место своего значка из item-icon', () => {
		const fixture = render(IconPage)
		const toast = shown(
			apiOf(fixture).show({ text: 'Отправляем…', type: 'info', loading: true }),
		)

		check()

		expect(iconBox().querySelector('.so-test-icon')).toBeNull()
		expect(iconBox().querySelectorAll('.so-progress-spinner')).toHaveLength(1)

		toast.loading = false
		check()

		expect(iconBox().querySelector('.so-progress-spinner')).toBeNull()
		expect(node('.so-test-icon', iconBox())).toBeTruthy()
	})
})

describe('Toasts · ARIA', () => {
	it('регион — region с живой областью и именем от локали провайдера вокруг менеджера', async () => {
		render(LocalePage)

		expect(region().getAttribute('role')).toBe('region')
		expect(region().getAttribute('aria-live')).toBe('polite')
		expect(region().getAttribute('aria-label')).toBe('Уведомления (F8)')

		// Номер слоя открыт только у слоя с узлом: его даёт кадр узла
		await nextFrame()
		check()

		expect(region().dataset.layer).toBeDefined()
		expect(region().style.zIndex).toBe(region().dataset.layer)
	})

	it('тост — status, срочный — alert; фокусируемый; крестик назван текстом', () => {
		const fixture = render(Page)

		apiOf(fixture).show('Сохранено')
		apiOf(fixture).show({ text: 'Ошибка сети', alert: true })
		check()

		const [urgent, polite] = toasts()

		expect(urgent?.getAttribute('role')).toBe('alert')
		expect(polite?.getAttribute('role')).toBe('status')
		expect(polite?.getAttribute('tabindex')).toBe('0')
		expect(polite?.dataset.open).toBe('true')
		expect(polite?.dataset.swiping).toBe('false')
		expect(node('.so-toasts-item__close', polite).getAttribute('aria-label')).toBe(
			'Close Сохранено',
		)
	})
})
