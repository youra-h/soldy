/**
 * @soldy/setup — тесты definePlugin
 */
import { describe, it, expect } from 'vitest'
import { definePlugin } from '../descriptors/base'
import { TestPluginA, PluginContrib } from './_fixtures'

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
