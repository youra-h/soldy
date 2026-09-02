/**
 * Общие фикстуры для тестов setup
 */
import type { IContribution } from '@soldy/accessor'

export class TestComponent {
    static defaultValues = { rendered: true, visible: true }
    rendered = true
    visible = true
    events = { on: () => {}, off: () => {} }
}

export class TestPluginA {
    static readonly key = Symbol('test-plugin-a')
    install() {}
    destroy() {}
}

export class TestPluginB {
    static readonly key = Symbol('test-plugin-b')
    install() {}
    destroy() {}
}

export const ContribA: IContribution = {
    props: [{ name: 'a', triggers: ['change:a'] }],
    events: ['show'],
}

export const ContribB: IContribution = {
    props: [{ name: 'b', triggers: ['change:b'] }],
    events: ['hide'],
}

export const PluginContrib: IContribution = {
    props: [{ name: 'element', triggers: ['ready', 'removed'] }],
    events: ['ready', 'removed'],
}
