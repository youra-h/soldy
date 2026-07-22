/**
 * @soldy/setup — тесты defineComponent / definePlugin / compileContribution
 */
import { describe, it, expect } from 'vitest'
import { defineComponent, definePlugin, compileContribution } from '../descriptors/base'
import { TComponentAccessor, type IContribution } from '@soldy/accessor'
import { TPluginBundle } from '@soldy/plugins'

// --- test fixtures ---

class TestComponent {
    static defaultValues = { rendered: true, visible: true }
    rendered = true
    visible = true
    events = { on: () => {}, off: () => {} }
}

class TestPluginA {
    static readonly key = Symbol('test-plugin-a')
    install() {}
    destroy() {}
}

class TestPluginB {
    static readonly key = Symbol('test-plugin-b')
    install() {}
    destroy() {}
}

const ContribA: IContribution = {
    props: [{ name: 'a', triggers: ['change:a'] }],
    events: ['show'],
}

const ContribB: IContribution = {
    props: [{ name: 'b', triggers: ['change:b'] }],
    events: ['hide'],
}

const PluginContrib: IContribution = {
    props: [{ name: 'element', triggers: ['ready', 'removed'] }],
    events: ['ready', 'removed'],
}

// ============================================================
// compileContribution
// ============================================================

describe('compileContribution', () => {
    it('undefined → пустые массивы', () => {
        const result = compileContribution(undefined)
        expect(result.props).toEqual([])
        expect(result.events).toEqual([])
    })

    it('без namespace — триггеры как есть', () => {
        const result = compileContribution(ContribA)

        expect(result.props[0].name).toBe('a')
        expect(result.props[0].triggers).toEqual(['change:a'])
        expect(result.props[0].namespace).toBeUndefined()
    })

    it('с namespace — префикс к триггерам', () => {
        const result = compileContribution(PluginContrib, 'element')

        expect(result.props[0].triggers).toEqual(['element:ready', 'element:removed'])
        expect(result.props[0].namespace).toBe('element')
    })

    it('protected нормализуется', () => {
        const result = compileContribution({
            props: [{ name: 'secret', protected: true }],
        })

        expect(result.props[0].protected).toBe(true)
    })

    it('protected по умолчанию false', () => {
        const result = compileContribution({
            props: [{ name: 'public' }],
        })

        expect(result.props[0].protected).toBe(false)
    })

    it('события с namespace', () => {
        const result = compileContribution(PluginContrib, 'element')

        expect(result.events).toEqual([
            { name: 'ready', namespace: 'element' },
            { name: 'removed', namespace: 'element' },
        ])
    })
})

// ============================================================
// definePlugin
// ============================================================

describe('definePlugin', () => {
    it('namespace извлекается из Symbol.key.description', () => {
        const plugin = definePlugin({ ctor: TestPluginA })

        expect(plugin.namespace).toBe('test-plugin-a')
        expect(plugin.key).toBe(TestPluginA.key)
    })

    it('contribution сохраняется', () => {
        const plugin = definePlugin({ ctor: TestPluginA, contribution: PluginContrib })

        expect(plugin.contribution).toBe(PluginContrib)
    })
})

// ============================================================
// defineComponent
// ============================================================

describe('defineComponent', () => {
    it('ctor сохраняется', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        expect(d.ctor).toBe(TestComponent)
    })

    it('props компилируются из contribution', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        expect(d.props.map(p => p.name)).toContain('a')
        expect(d.props.map(p => p.namespace)).toContain(undefined)
    })

    it('events компилируются из contribution', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        expect(d.events.map(e => e.name)).toContain('show')
    })

    it('extends: наследует props родителя', () => {
        const parent = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        const child = defineComponent({
            ctor: TestComponent,
            extends: parent,
            contribution: ContribB,
        })

        const names = child.props.map(p => p.name)
        expect(names).toContain('a')
        expect(names).toContain('b')
        // порядок: родитель → свой
        expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'))
    })

    it('extends: наследует events родителя', () => {
        const parent = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        const child = defineComponent({
            ctor: TestComponent,
            extends: parent,
            contribution: ContribB,
        })

        expect(child.events.map(e => e.name)).toContain('show')
        expect(child.events.map(e => e.name)).toContain('hide')
    })

    it('extends: наследует плагины родителя', () => {
        const parent = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
            plugins: [definePlugin({ ctor: TestPluginA })],
        })

        const child = defineComponent({
            ctor: TestComponent,
            extends: parent,
            contribution: ContribB,
            plugins: [definePlugin({ ctor: TestPluginB })],
        })

        expect(child.plugins.length).toBe(2)
        expect(child.plugins[0].ctor).toBe(TestPluginA)
        expect(child.plugins[1].ctor).toBe(TestPluginB)
    })

    it('плагины добавляют props и events в дескриптор', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
            plugins: [
                definePlugin({ ctor: TestPluginA, contribution: PluginContrib }),
            ],
        })

        const names = d.props.map(p => p.name)
        expect(names).toContain('a')
        expect(names).toContain('element')

        const events = d.events.map(e => e.name)
        expect(events).toContain('ready')
        expect(events).toContain('removed')
    })

    it('триггеры плагинов компилируются с namespace', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
            plugins: [
                definePlugin({ ctor: TestPluginA, contribution: PluginContrib }),
            ],
        })

        const elementProp = d.props.find(p => p.name === 'element')!
        expect(elementProp.triggers).toEqual(['test-plugin-a:ready', 'test-plugin-a:removed'])
    })

    // --- createBundle ---

    it('createBundle: создаёт TPluginBundle с плагинами', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
            plugins: [definePlugin({ ctor: TestPluginA })],
        })

        const bundle = d.createBundle()

        expect(bundle).toBeInstanceOf(TPluginBundle)
        expect(bundle.get(TestPluginA as any)).toBeDefined()
    })

    it('createBundle: без плагинов — пустой бандл', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        const bundle = d.createBundle()

        expect(bundle).toBeInstanceOf(TPluginBundle)
    })

    // --- createAccessor ---

    it('createAccessor: возвращает TComponentAccessor', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        const instance = new TestComponent()
        const bundle = d.createBundle()
        const accessor = d.createAccessor(instance, bundle)

        expect(accessor).toBeInstanceOf(TComponentAccessor)
    })

    it('createAccessor: плагины попадают в pluginsMap', () => {
        const d = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
            plugins: [
                definePlugin({ ctor: TestPluginA, contribution: PluginContrib }),
            ],
        })

        const instance = new TestComponent()
        const bundle = d.createBundle()
        const accessor = d.createAccessor(instance, bundle)

        const pluginInstance = bundle.get(TestPluginA as any)
        const value = accessor.getValue(
            d.props.find(p => p.name === 'element')!,
        )

        expect(value).toBe((pluginInstance as any).element)
    })

    it('ctor по умолчанию — Object если не задан', () => {
        const d = defineComponent({ contribution: ContribA })

        expect(d.ctor).toBe(Object)
    })

    it('extends: ctor наследуется от родителя', () => {
        const parent = defineComponent({
            ctor: TestComponent,
            contribution: ContribA,
        })

        const child = defineComponent({
            extends: parent,
            contribution: ContribB,
        })

        expect(child.ctor).toBe(TestComponent)
    })
})
