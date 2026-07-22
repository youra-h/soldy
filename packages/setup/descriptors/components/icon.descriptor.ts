/**
 * Дескриптор Icon (TIcon).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, width, height + плагин IconStyle.
 */

import { defineComponent, definePlugin } from '../define-component'
import { TIcon } from '@soldy/core'
import { TIconStylePlugin } from '@soldy/plugins'
import { IconContribution } from '../../contributions/components/icon'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = defineComponent({
    ctor: TIcon,

    extends: ComponentViewDescriptor,

    contribution: IconContribution,

    plugins: [
        definePlugin({
            ctor: TIconStylePlugin,
        }),
    ],
})
