import { bootstrapApplication } from '@angular/platform-browser'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'
import { appConfig } from './app/app.config'
import { App } from './app/app'

useIcons(material)
useTheme(oren)

bootstrapApplication(App, appConfig).catch((error: unknown) => console.error(error))
