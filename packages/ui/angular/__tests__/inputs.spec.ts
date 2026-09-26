/**
 * Входы в строгом шаблоне потребителя.
 *
 * Значение привязки входа строгая проверка шаблона (`strictTemplates`, как в
 * новом приложении Angular) сверяет с полем класса — `_t1.text = 42`. Входы
 * компонентов объявлены массивом имён, и вход без поля она пропускает молча,
 * с любым значением: число в `text`, размер, которого нет. Поле с типом пропа
 * дескриптора даёт сгенерированный `T<Имя>Surface`, и он же объявляет входы
 * своим декоратором: поле входа ищется среди членов того класса, чей
 * декоратор объявил вход.
 *
 * Булев вход декоратор объявляет с `transform: booleanInput`. Атрибут без
 * значения (`<soldy-button disabled>`) Angular отдаёт входу пустой строкой, а
 * transform превращает её в `true`, как это делают остальные адаптеры. Тип
 * записи такого входа проверка берёт у параметра transform, а не у поля.
 *
 * Здесь пять проверок:
 * - хосты с верными значениями, `disabled` без значения тоже: их шаблоны
 *   проверяет «Типы — Angular», а рантайм доносит значения из шаблона до ядра;
 * - снятый булев вход возвращается к умолчанию, а не к `false`;
 * - `expectTypeOf` — тип поля: с `any` верный шаблон прошёл бы и так;
 * - какие входы генератор считает булевыми;
 * - хосты каждого компонента экспорта, которые компилирует здесь же
 *   компилятор Angular, в памяти: неверное значение в каждом входе — ошибка на
 *   каждом, булевы входы атрибутом без значения — ни одной ошибки, со
 *   значением `"yes"` — ошибка на каждом. Под `@ts-expect-error` отрицательный
 *   случай не записать — ошибка шаблона приходит не из строки TS. А без него
 *   сверку незаметно выключил бы даже вход, объявленный ещё раз в `@Component`
 *   компонента: поле в базе на месте, тип у него верный, и верный шаблон
 *   компилируется — выдаёт поломку только неверное значение, которое прошло.
 */

import { describe, it, expect, expectTypeOf, beforeAll } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import {
	NodeJSFileSystem,
	createCompilerHost,
	performCompilation,
	readConfiguration,
	setFileSystem,
} from '@angular/compiler-cli'
import { Component, reflectComponentType, signal, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import type { TButtonView, TComponentSize } from '@soldy-ui/core'
import {
	ButtonDescriptor,
	ValueControlDescriptor,
	type TExternalPluginProps,
} from '@soldy-ui/setup'
import * as angular from '@soldy-ui/angular'
import {
	TButtonComponent,
	TComponentComponent,
	TComponentViewComponent,
	useBooleanInputs,
	useInputs,
} from '@soldy-ui/angular'

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<soldy-button [text]="text()" [size]="size()" aria_label="Сохранить" disabled />`,
})
class ButtonHost {
	readonly text = signal('Save')
	readonly size = signal<TComponentSize>('xl')
}

@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<soldy-component-view [visible]="visible()" direction="rtl" />`,
})
class ComponentViewHost {
	readonly visible = signal(false)
}

/** Корень Button в хосте — первый элемент внутри `<soldy-button>`. */
function buttonRoot(fixture: ComponentFixture<unknown>): Element {
	const host: HTMLElement = fixture.nativeElement
	const root = host.querySelector('soldy-button')?.firstElementChild

	if (!root) throw new Error('Корень Button не отрисован')

	return root
}

describe('вход в строгом шаблоне · значение доходит до ядра', () => {
	it('Button: [text], [size] и aria_label', () => {
		const fixture = TestBed.createComponent(ButtonHost)

		fixture.detectChanges()

		const root = buttonRoot(fixture)

		expect(root.querySelector('.s-button__text')?.textContent?.trim()).toBe('Save')
		expect(root.classList).toContain('s-button--size-xl')
		expect(root.getAttribute('aria-label')).toBe('Сохранить')

		fixture.componentInstance.text.set('Saved')
		fixture.componentInstance.size.set('sm')
		fixture.detectChanges()

		expect(root.querySelector('.s-button__text')?.textContent?.trim()).toBe('Saved')
		expect(root.classList).toContain('s-button--size-sm')
		expect(root.classList).not.toContain('s-button--size-xl')
	})

	it('ComponentView: [visible] и direction', () => {
		const fixture = TestBed.createComponent(ComponentViewHost)

		fixture.detectChanges()

		const host: HTMLElement = fixture.nativeElement
		const view = host.querySelector('soldy-component-view')

		if (!(view instanceof HTMLElement)) throw new Error('<soldy-component-view> не отрисован')

		expect(view.style.display).toBe('none')
		expect(view.getAttribute('dir')).toBe('rtl')

		fixture.componentInstance.visible.set(true)
		fixture.detectChanges()

		expect(view.style.display).toBe('')
	})
})

describe('булев вход · атрибут без значения', () => {
	/**
	 * Без transform `''` доходила до ядра: запись проходила, но пустая строка —
	 * ложь, и кнопка оставалась включённой.
	 */
	it('Button: disabled без значения выключает кнопку', () => {
		const fixture = TestBed.createComponent(ButtonHost)

		fixture.detectChanges()

		const root = buttonRoot(fixture)

		expect(root.getAttribute('data-disabled')).toBe('true')
		expect(root.hasAttribute('disabled')).toBe(true)
	})

	/**
	 * `booleanInput` отдаёт `undefined` как есть, и снятый вход связка
	 * возвращает к умолчанию декларации. `booleanAttribute` из `@angular/core`
	 * отдал бы `false`, и `visible` с умолчанием `true` остался бы скрытым.
	 */
	it('снятый булев вход возвращается к умолчанию, а не к false', () => {
		const fixture = TestBed.createComponent(TComponentViewComponent)
		const host: HTMLElement = fixture.nativeElement

		fixture.componentRef.setInput('visible', false)
		fixture.detectChanges()

		expect(host.style.display).toBe('none')

		fixture.componentRef.setInput('visible', undefined)
		fixture.detectChanges()

		expect(host.style.display).toBe('')
	})
})

/**
 * Тип поля — то, с чем проверка шаблона сверяет значение. С `any` на его месте
 * хосты выше скомпилировались бы при любом значении.
 */
describe('тип входа · тип пропа дескриптора', () => {
	it('свой проп компонента', () => {
		expectTypeOf<TButtonComponent['text']>().toEqualTypeOf<string | undefined>()
		expectTypeOf<TButtonComponent['size']>().toEqualTypeOf<TComponentSize | undefined>()
		expectTypeOf<TButtonComponent['view']>().toEqualTypeOf<TButtonView | undefined>()
		expectTypeOf<TComponentViewComponent['visible']>().toEqualTypeOf<boolean | undefined>()
	})

	/**
	 * Поле хранит то, что вернул transform. Запись — `''` у атрибута без
	 * значения — проверка шаблона сверяет с параметром transform, а не с полем.
	 */
	it('булев вход — значение после transform', () => {
		expectTypeOf<TButtonComponent['disabled']>().toEqualTypeOf<boolean | undefined>()
	})

	it('проп плагина — под именем с неймспейсом', () => {
		expectTypeOf<TButtonComponent['aria_label']>().toEqualTypeOf<string | undefined>()
	})

	it('служебный проп адаптера', () => {
		expectTypeOf<TComponentComponent['embedded']>().toEqualTypeOf<string | undefined>()
		expectTypeOf<TComponentComponent['pluginProps']>().toEqualTypeOf<
			TExternalPluginProps | undefined
		>()
	})
})

/**
 * Булев вход — проп, объявленный ровно `Boolean`: ему генератор ставит
 * transform. У пропа, где `Boolean` — один из типов, пустая строка — значение,
 * и transform его не получает.
 */
describe('булев вход · критерий генератора', () => {
	it('проп ровно Boolean', () => {
		expect(useBooleanInputs(ButtonDescriptor())).toEqual([
			'rendered',
			'visible',
			'disabled',
			'focused',
		])
	})

	it('Boolean среди типов пропа — не булев вход', () => {
		expect(useInputs(ValueControlDescriptor())).toContain('value')
		expect(useBooleanInputs(ValueControlDescriptor())).not.toContain('value')
	})
})

/** Корень пакета: у собранного спека `import.meta.url` — его исходник. */
const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Класс из экспорта: `reflectComponentType` принимает только конструктор.
 * Утилиты экспорта (`useAdapter`, `setupButton`) для JS тоже функции с
 * прототипом, но компонента за ними она не найдёт.
 */
function isConstructor(value: unknown): value is Type<unknown> {
	return typeof value === 'function' && typeof value.prototype === 'object'
}

type TExportedComponent = {
	/** Имя в экспорте пакета: под ним хост импортирует компонент. */
	readonly name: string
	readonly selector: string
	/** Все входы в том виде, в каком их видит шаблон, с `ctrl` базы. */
	readonly inputs: readonly string[]
	/**
	 * Булевы входы — входы с transform: другого transform у компонентов нет.
	 * Берутся из рантайма, поэтому видно, что transform дошёл до компонента
	 * через наследование от `T<Имя>Surface`.
	 */
	readonly booleans: readonly string[]
}

/** Компоненты экспорта — не ручным списком: новый попадёт под проверку сам. */
function exportedComponents(): TExportedComponent[] {
	const entries: Record<string, unknown> = angular
	const result: TExportedComponent[] = []

	for (const [name, value] of Object.entries(entries)) {
		const mirror = isConstructor(value) ? reflectComponentType(value) : null

		if (!mirror) continue

		result.push({
			name,
			selector: mirror.selector,
			inputs: mirror.inputs.map((input) => input.templateName),
			booleans: mirror.inputs
				.filter((input) => input.transform !== undefined)
				.map((input) => input.templateName),
		})
	}

	return result
}

/** Виды хоста — по тому, что стоит на элементе компонента. */
const HOST_KINDS = ['wrong', 'bare', 'yes'] as const

type THostKind = (typeof HOST_KINDS)[number]

const BINDINGS: Record<THostKind, (component: TExportedComponent) => readonly string[]> = {
	// `symbol` не подходит ни одному пропу компонентов: вход, чья привязка
	// скомпилировалась, не сверяется с типом вовсе
	wrong: ({ inputs }) => inputs.map((input) => `[${input}]="wrong"`),
	// Атрибут без значения — пустая строка: её принимает параметр transform
	bare: ({ booleans }) => booleans,
	// Любая другая строка булеву входу не подходит
	yes: ({ booleans }) => booleans.map((input) => `${input}="yes"`),
}

/** Хост потребителя, у которого на элементе компонента стоят `bindings`. */
function hostSource({ name, selector }: TExportedComponent, bindings: readonly string[]): string {
	return [
		`import { Component } from '@angular/core'`,
		`import { ${name} } from '@soldy-ui/angular'`,
		'',
		'@Component({',
		'	standalone: true,',
		`	imports: [${name}],`,
		`	template: \`<${selector} ${bindings.join(' ')} />\`,`,
		'})',
		'export class Host {',
		`	readonly wrong = Symbol('wrong')`,
		'}',
		'',
	].join('\n')
}

/** Входной файл хоста. На диске его нет: он лежит рядом со спеком, чтобы разрешались пакеты. */
const hostFile = (component: TExportedComponent, kind: THostKind): string =>
	resolve(PACKAGE, `__tests__/inputs.${component.name}.${kind}.host.ts`)

type TRejection = {
	/** Что подчёркнуто в шаблоне: у неверного значения — имя входа. */
	readonly span: string
	readonly code: number
}

/**
 * Программа с опциями `tsconfig.json` пакета, как у «Типы — Angular», и
 * хостами в памяти. Возвращает ошибки по файлам хостов, а всё, что пришло
 * не из них, — отдельным списком.
 */
function compileHosts(sources: ReadonlyMap<string, string>): {
	readonly rejections: ReadonlyMap<string, readonly TRejection[]>
	readonly outside: readonly string[]
} {
	setFileSystem(new NodeJSFileSystem())

	const config = readConfiguration(resolve(PACKAGE, 'tsconfig.json'))
	const host = createCompilerHost({ options: config.options })
	const getSourceFile = host.getSourceFile.bind(host)
	const fileExists = host.fileExists.bind(host)
	const readFile = host.readFile.bind(host)

	host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
		const source = sources.get(resolve(fileName))

		return source === undefined
			? getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
			: ts.createSourceFile(fileName, source, languageVersion, true)
	}
	host.fileExists = (fileName) => sources.has(resolve(fileName)) || fileExists(fileName)
	host.readFile = (fileName) => sources.get(resolve(fileName)) ?? readFile(fileName)

	const { diagnostics } = performCompilation({
		// Фикстура темы — как в программе пакета: без неё реестры значений пусты
		rootNames: [...sources.keys(), resolve(PACKAGE, '__tests__/theme.d.ts')],
		options: config.options,
		host,
	})

	const rejections = new Map<string, TRejection[]>()
	const outside = config.errors.map((error) =>
		ts.flattenDiagnosticMessageText(error.messageText, '\n'),
	)

	const ordered = [...diagnostics].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))

	for (const diagnostic of ordered) {
		const fileName = diagnostic.file ? resolve(diagnostic.file.fileName) : undefined
		const source = fileName === undefined ? undefined : sources.get(fileName)

		if (fileName === undefined || source === undefined || diagnostic.start === undefined) {
			outside.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
			continue
		}

		const list = rejections.get(fileName) ?? []

		list.push({
			span: source.slice(diagnostic.start, diagnostic.start + (diagnostic.length ?? 0)),
			code: diagnostic.code,
		})
		rejections.set(fileName, list)
	}

	return { rejections, outside }
}

describe('вход в строгом шаблоне · хосты компонентов экспорта', () => {
	const components = exportedComponents()
	const withBooleans = components.filter(({ booleans }) => booleans.length > 0)
	let compiled: ReturnType<typeof compileHosts>

	const rejectionsOf = (component: TExportedComponent, kind: THostKind) =>
		compiled.rejections.get(hostFile(component, kind)) ?? []

	// Компилятор Angular разбирает всю программу пакета: секунды, а не миллисекунды
	beforeAll(() => {
		compiled = compileHosts(
			new Map(
				components.flatMap((component) =>
					HOST_KINDS.map(
						(kind) =>
							[
								hostFile(component, kind),
								hostSource(component, BINDINGS[kind](component)),
							] as const,
					),
				),
			),
		)
	}, 60_000)

	it('компоненты найдены в экспорте', () => {
		expect(components.map(({ name }) => name)).toEqual(
			expect.arrayContaining([
				'TButtonComponent',
				'TComponentViewComponent',
				'TComponentComponent',
			]),
		)
	})

	/**
	 * Без этого проверки булевых входов ниже прошли бы и пустыми: пропади
	 * transform, у компонентов не осталось бы ни одного булева входа.
	 */
	it('transform стоит ровно на булевых входах генератора', () => {
		const button = components.find(({ name }) => name === 'TButtonComponent')

		expect(button?.booleans).toEqual(useBooleanInputs(ButtonDescriptor()))
	})

	it('кроме привязок хостов, ошибок в программе нет', () => {
		expect(compiled.outside).toEqual([])
	})

	it.each(components.map((component) => [component.name, component] as const))(
		'%s: неверное значение — ошибка на каждом входе',
		(_name, component) => {
			// TS2322 — «значение не присваивается типу поля»: сверка шла по входу
			expect(rejectionsOf(component, 'wrong')).toEqual(
				component.inputs.map((input) => ({ span: input, code: 2322 })),
			)
		},
	)

	it.each(withBooleans.map((component) => [component.name, component] as const))(
		'%s: булевы входы атрибутом без значения — без ошибок',
		(_name, component) => {
			expect(rejectionsOf(component, 'bare')).toEqual([])
		},
	)

	it.each(withBooleans.map((component) => [component.name, component] as const))(
		'%s: булевы входы со значением "yes" — ошибка на каждом',
		(_name, component) => {
			// Тип записи — параметр transform, `boolean | '' | undefined`, а не `string`
			expect(rejectionsOf(component, 'yes')).toEqual(
				component.booleans.map((input) => ({ span: input, code: 2322 })),
			)
		},
	)
})
