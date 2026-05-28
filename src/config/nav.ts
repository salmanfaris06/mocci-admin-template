import { AppWindowIcon, BoxIcon, ChartNoAxesCombinedIcon, NavigationIcon, PanelLeftIcon, ShapesIcon, TypeIcon } from 'lucide-react'

import type { NavConfig } from '@/components/app-shell'

export const dashboardNav: NavConfig = {
  groups: [
    {
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard-shell-01',
          icon: ChartNoAxesCombinedIcon
        }
      ]
    },
    {
      label: 'Components',
      items: [
        {
          title: 'Form',
          url: '#',
          icon: TypeIcon,
          items: [
            { title: 'Button', url: '/components/button' },
            { title: 'Checkbox', url: '/components/checkbox' },
            { title: 'Combobox', url: '/components/combobox' },
            { title: 'Date Picker', url: '/components/date-picker' },
            { title: 'Input', url: '/components/input' },
            { title: 'Input OTP', url: '/components/input-otp' },
            { title: 'Label', url: '/components/label' },
            { title: 'Radio Group', url: '/components/radio-group' },
            { title: 'Select', url: '/components/select' },
            { title: 'Slider', url: '/components/slider' },
            { title: 'Switch', url: '/components/switch' },
            { title: 'Textarea', url: '/components/textarea' },
            { title: 'Toggle', url: '/components/toggle' },
            { title: 'Toggle Group', url: '/components/toggle-group' }
          ]
        },
        {
          title: 'Display',
          url: '#',
          icon: BoxIcon,
          items: [
            { title: 'Accordion', url: '/components/accordion' },
            { title: 'Alert', url: '/components/alert' },
            { title: 'Aspect Ratio', url: '/components/aspect-ratio' },
            { title: 'Avatar', url: '/components/avatar' },
            { title: 'Badge', url: '/components/badge' },
            { title: 'Card', url: '/components/card' },
            { title: 'Carousel', url: '/components/carousel' },
            { title: 'Empty', url: '/components/empty' },
            { title: 'Kbd', url: '/components/kbd' },
            { title: 'Progress', url: '/components/progress' },
            { title: 'Separator', url: '/components/separator' },
            { title: 'Skeleton', url: '/components/skeleton' },
            { title: 'Spinner', url: '/components/spinner' },
            { title: 'Table', url: '/components/table' }
          ]
        },
        {
          title: 'Navigation',
          url: '#',
          icon: NavigationIcon,
          items: [
            { title: 'Breadcrumb', url: '/components/breadcrumb' },
            { title: 'Menubar', url: '/components/menubar' },
            { title: 'Navigation Menu', url: '/components/navigation-menu' },
            { title: 'Pagination', url: '/components/pagination' },
            { title: 'Tabs', url: '/components/tabs' }
          ]
        },
        {
          title: 'Overlay',
          url: '#',
          icon: AppWindowIcon,
          items: [
            { title: 'Alert Dialog', url: '/components/alert-dialog' },
            { title: 'Context Menu', url: '/components/context-menu' },
            { title: 'Dialog', url: '/components/dialog' },
            { title: 'Drawer', url: '/components/drawer' },
            { title: 'Dropdown Menu', url: '/components/dropdown-menu' },
            { title: 'Hover Card', url: '/components/hover-card' },
            { title: 'Popover', url: '/components/popover' },
            { title: 'Sheet', url: '/components/sheet' },
            { title: 'Sonner', url: '/components/sonner' },
            { title: 'Tooltip', url: '/components/tooltip' }
          ]
        },
        {
          title: 'Layout',
          url: '#',
          icon: PanelLeftIcon,
          items: [
            { title: 'Resizable', url: '/components/resizable' },
            { title: 'Scroll Area', url: '/components/scroll-area' }
          ]
        }
      ]
    },
    {
      label: 'Resources',
      items: [
        { title: 'Icons', url: '/icons', icon: ShapesIcon }
      ]
    }
  ]
}
