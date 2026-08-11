/**
 * @soldy/setup — тесты defineComponent
 */
import { describe, it, expect } from 'vitest'
import { defineComponent, definePlugin } from '../descriptors/base'
import { TComponentAccessor } from '@soldy/accessor'
import { TPluginBundle } from '@soldy/plugins'
import { TestComponent, TestPluginA, TestPluginB, ContribA, ContribB, PluginContrib } from './_fixtures'

describe('defineComponent', () => {
    it('ctor сохраняется', () => {
        expect(defineComponent({ ctor: TestComponent, contribution: ContribA }).ctor).toBe(TestComponent)
    })

    it('props компилируются из contribution', () => {
        const d = defineComponent({ ctor: TestComponent, contribution: ContribA })
        expect(d.props.map(p => p.name)).toContain('a')
    })

    it('events компилируются из contribution', () => {
        const d = defineComponent({ ctor: TestComponent, contribution: ContribA })
        expect(d.events.map(e => e.name)).toContain('show')
    })

    it('ctor по умолчанию — Object', () => {
        expect(defineComponent({ contribution: ContribA }).ctor).toBe(Object)
    })

    // --- extends ---

    it('extends: наследует props', () => {
        const parent = defineComponent({ ctor: TestComponent, contribution: ContribA })
        const child = defineComponent({ ctor: TestComponent, extends: parent, contribution: ContribB })
        const names = child.props.map(p => p.name)
        expect(names).toContain('a')
        expect(names).toContain('b')
    })

    it('extends: наследует events', () => {
        const parent = defineComponent({ ctor: TestComponent, contribution: ContribA })
        const child = defineComponent({ ctor: TestComponent, extends: parent, contribution: ContribB })
        expect(child.events.map(e => e.name)).toContain('show')
        expect(child.events.map(e => e.name)).toContain('hide')
    })

    it('extends: наследует плагины', () => {
        const parent = defineComponent({ ctor: TestComponent, contribution: ContribA, plugins: [definePlugin({ ctor: TestPluginA })] })
        const child = defineComponent({ ctor: TestComponent, extends: parent, contribution: ContribB, plugins: [definePlugin({ ctor: TestPluginB })] })
        expect(child.plugins.length).toBe(2)
    })

    it('extends: ctor наследуется', () => {
        const parent = defineComponent({ ctor: TestComponent, contribution: ContribA })
        expect(defineComponent({ extends: parent, contribution: ContribB }).ctor).toBe(TestComponent)
    })

    // --- plugins ---

    it('плагины добавляют props и events', () => {
        const d = defineComponent({ ctor: TestComponent, contribution: ContribA, plugins: [definePlugin({ ctor: TestPluginA, contribution: PluginContrib })] })
        expect(d.props.map(p => p.name)).toContain('element')
        expect(d.events.map(e => e.name)).toContain('ready')
    })

    it('триггеры плагинов с namespace', () => {
        const d = defineComponent({ ctor: TestComponent, contribution: ContribA, plugins: [definePlugin({ ctor: TestPluginA, contribution: PluginContrib })] })
        expect(d.props.find(p => p.name === 'element')!.triggers).toEqual(['test-plugin-a:ready', 'test-plugin-a:removed'])
    })

    // --- createBundle ---

    it('createBundle: с плагинами', () => {
        const d = defineComponent({ ctor: TestComponent, contribution: ContribA, plugins: [definePlugin({ ctor: TestPluginA })] })
        expect(d.createBundle()).toBeInstanceOf(TPluginBundle)
    })

    it('createBundle: без плагинов', () => {
        expect(defineComponent({ ctor: TestComponent, contribution: ContribA }).createBundle()).toBeInstanceOf(TPluginBundle)
    })

    // --- createAccessor ---

    it('createAccessor: возвращает TComponentAccessor', () => {
        const d = defineComponent({ ctor: TestComponent, contribution: ContribA })
        expect(d.createAccessor(new TestComponent(), d.createBundle())).toBeInstanceOf(TComponentAccessor)
    })

    it('createAccessor: плагины в pluginsMap', () => {
        const d = defineComponent({ ctor: TestComponent, contribution: ContribA, plugins: [definePlugin({ ctor: TestPluginA, contribution: PluginContrib })] })
        const bundle = d.createBundle()
        const accessor = d.createAccessor(new TestComponent(), bundle)
        expect(accessor.getValue(d.props.find(p => p.name === 'element')!)).toBe((bundle.get(TestPluginA as any) as any).element)
    })
})
