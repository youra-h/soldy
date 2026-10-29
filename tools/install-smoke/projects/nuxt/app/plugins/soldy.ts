import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

// The registries are global: filled once per process, on the server too, not
// once per request
useIcons(material)
useTheme(oren)

export default defineNuxtPlugin(() => {})
