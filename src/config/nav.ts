import {
  AlertTriangleIcon,
  AppWindowIcon,
  BellIcon,
  BoxIcon,
  ChartNoAxesCombinedIcon,
  ChartPieIcon,
  ClipboardListIcon,
  CreditCardIcon,
  WalletIcon,
  FileTextIcon,
  GaugeIcon,
  HelpCircleIcon,
  InboxIcon,
  LayoutGridIcon,
  LockIcon,
  NavigationIcon,
  PanelLeftIcon,
  RocketIcon,
  ShapesIcon,
  ShoppingCartIcon,
  TableIcon,
  TypeIcon,
  UserIcon,
  UsersIcon,
  BotIcon
} from 'lucide-react'

import type { NavConfig } from '@/components/app-shell'

export const dashboardNav: NavConfig = {
  groups: [
    {
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: ChartNoAxesCombinedIcon
        },
        {
          title: 'SaaS Dashboard',
          url: '/dashboard-saas',
          icon: GaugeIcon
        },
        {
          title: 'Analytics',
          url: '/analytics',
          icon: ChartPieIcon
        }
      ]
    },

    {
      label: 'CRM AI',
      items: [
        {
          title: 'CRM AI',
          url: '#',
          icon: BotIcon,
          items: [
            { title: 'Overview', url: '/crm' },
            { title: 'Inbox', url: '/crm/inbox' },
            { title: 'Contacts', url: '/crm/contacts' },
            { title: 'Pipeline', url: '/crm/pipeline' },
            { title: 'AI Agent', url: '/crm/ai-agent' },
            { title: 'Analytics', url: '/crm/analytics' },
            { title: 'Settings', url: '/crm/settings' }
          ]
        }
      ]
    },
    {
      label: 'E-Commerce',
      items: [
        {
          title: 'E-Commerce',
          url: '#',
          icon: ShoppingCartIcon,
          items: [
            { title: 'Dashboard', url: '/pages/ecommerce/dashboard' },
            { title: 'Products', url: '/pages/ecommerce/products' },
            { title: 'Orders', url: '/pages/ecommerce/orders' },
            { title: 'Customers', url: '/pages/ecommerce/customers' }
          ]
        }
      ]
    },
    {
      label: 'Pages',
      items: [
        {
          title: 'Authentication',
          url: '#',
          icon: LockIcon,
          items: [
            { title: 'Login', url: '/auth/login' },
            { title: 'Register', url: '/auth/register' },
            { title: 'Forgot Password', url: '/auth/forgot-password' },
            { title: 'Reset Password', url: '/auth/reset-password' },
            { title: 'OTP Verification', url: '/auth/otp-verification' },
            { title: 'Lock Screen', url: '/auth/lock-screen' },
            { title: 'Verify Email', url: '/auth/verify-email' }
          ]
        },
        {
          title: 'Errors',
          url: '#',
          icon: AlertTriangleIcon,
          items: [
            { title: '404 Not Found', url: '/pages/404' },
            { title: '500 Server Error', url: '/pages/500' }
          ]
        },
        { title: 'Onboarding', url: '/pages/onboarding', icon: RocketIcon },
        {
          title: 'Apps',
          url: '#',
          icon: LayoutGridIcon,
          items: [
            { title: 'Calendar', url: '/pages/calendar' },
            { title: 'Inbox', url: '/pages/inbox' },
            { title: 'Chat', url: '/pages/chat' },
            { title: 'Files', url: '/pages/files' },
            { title: 'Kanban', url: '/pages/kanban' },
            { title: 'Activity', url: '/pages/activity' }
          ]
        },
        {
          title: 'Account',
          url: '#',
          icon: UserIcon,
          items: [
            { title: 'Profile', url: '/pages/profile' },
            { title: 'Settings', url: '/pages/settings' }
          ]
        },
        {
          title: 'Members',
          url: '#',
          icon: UsersIcon,
          items: [
            { title: 'Team', url: '/pages/team' },
            { title: 'Users & Roles', url: '/pages/users-roles' }
          ]
        },
        { title: 'Pricing', url: '/pages/pricing', icon: CreditCardIcon },
        { title: 'Billing', url: '/pages/billing', icon: WalletIcon },
        { title: 'Invoice', url: '/pages/invoice', icon: FileTextIcon },
        { title: 'Form Examples', url: '/pages/form-examples', icon: ClipboardListIcon },
        { title: 'Data Table', url: '/pages/datatable', icon: TableIcon },
        { title: 'Help Center', url: '/pages/help', icon: HelpCircleIcon },
        { title: 'Notifications', url: '/pages/notifications', icon: BellIcon },
        { title: 'Empty States', url: '/pages/empty-states', icon: InboxIcon }
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
            { title: 'Form', url: '/components/form' },
            { title: 'Input', url: '/components/input' },
            { title: 'Input Group', url: '/components/input-group' },
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
            { title: 'Collapsible', url: '/components/collapsible' },
            { title: 'Empty', url: '/components/empty' },
            { title: 'Item', url: '/components/item' },
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
            { title: 'Command', url: '/components/command' },
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
        { title: 'Charts', url: '/charts', icon: ChartPieIcon },
        { title: 'Icons', url: '/icons', icon: ShapesIcon }
      ]
    }
  ]
}
