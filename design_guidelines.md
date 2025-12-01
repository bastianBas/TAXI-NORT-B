# Design Guidelines: Taxi Nort S.A. Fleet Management System

## Design Approach
**Selected Approach:** Design System (Material Design principles)  
**Justification:** This is a data-heavy, utility-focused fleet management application requiring efficient information display, clear hierarchy, and reliable interaction patterns. Material Design provides proven patterns for dashboards, forms, and data visualization while maintaining professional aesthetics.

**Core Design Principles:**
- Clarity over decoration: Information accessibility is paramount
- Consistent feedback: All interactions provide clear visual responses
- Hierarchy through structure: Data organization drives visual decisions
- Professional restraint: Functional beauty without distraction

## Color Palette

**Primary Colors (Fleet Blue):**
- Light mode primary: 210 80% 45% (strong blue for transport/fleet identity)
- Dark mode primary: 210 70% 55% (adjusted for dark backgrounds)

**Neutral Foundation:**
- Dark mode background: 220 15% 10% (deep charcoal)
- Dark mode surface: 220 15% 15% (elevated panels)
- Dark mode border: 220 10% 25% (subtle separation)
- Light text on dark: 0 0% 95% (high contrast text)
- Muted text: 220 5% 65% (secondary information)

**Accent Colors:**
- Success (payments complete): 142 70% 45%
- Warning (pending actions): 38 90% 50%
- Error (missing slips): 0 70% 50%
- Info (GPS tracking): 200 80% 50%

**Status Indicators:**
- Active driver: 142 60% 50%
- Inactive: 220 5% 50%
- Payment pending: 38 90% 50%
- Payment complete: 142 70% 45%

## Typography

**Font Family:**
- Primary: 'Inter' via Google Fonts (excellent for data display and UI)
- Monospace: 'JetBrains Mono' for RUT, license plates, numerical data

**Type Scale:**
- Page headers: text-2xl font-semibold (dashboard titles)
- Section headers: text-lg font-medium (card titles, table headers)
- Body text: text-base font-normal (form labels, descriptions)
- Data values: text-sm font-medium (table cells, metrics)
- Captions: text-xs font-normal (timestamps, helper text)

**Hierarchy Guidelines:**
- KPI numbers: text-3xl font-bold (dashboard metrics)
- License plates/RUT: font-mono text-sm (technical identifiers)
- Status labels: text-xs font-semibold uppercase tracking-wide

## Layout System

**Spacing Primitives:**
Core spacing units: 2, 4, 6, 8, 12, 16 (Tailwind scale)
- Tight spacing: p-2, gap-2 (buttons, inline elements)
- Standard spacing: p-4, gap-4 (cards, form fields)
- Section spacing: p-6 to p-8 (page sections, modals)
- Page margins: p-8 to p-12 (main content areas)

**Grid Structure:**
- Dashboard: 12-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Data tables: Full width with responsive scroll
- Forms: max-w-2xl centered, two-column on desktop (grid-cols-1 md:grid-cols-2)
- Sidebar: Fixed 64 width (w-64), collapsible on mobile

**Container Widths:**
- Main content: max-w-7xl mx-auto
- Forms/modals: max-w-2xl
- Full-width tables: w-full with horizontal scroll

## Component Library

**Navigation:**
- Top bar: Fixed header with logo, user menu, notifications (h-16, bg-surface)
- Sidebar: Collapsible navigation (w-64), icon + label pattern, active state with primary color border-l-4
- Breadcrumbs: Text links with chevron separators for deep navigation

**Dashboard Cards:**
- KPI Cards: White/surface background, rounded-lg, p-6, shadow-sm
- Structure: Icon (top-left), metric (large center), label (below), trend indicator (optional)
- Grid: 4 columns on desktop, 2 on tablet, 1 on mobile

**Data Tables:**
- Header: Sticky top, bg-surface, font-medium, border-b-2
- Rows: Hover state with subtle bg change, zebra striping optional
- Actions: Right-aligned icon buttons (edit, delete, view)
- Pagination: Bottom-aligned, showing "X-Y of Z results"
- Responsive: Stack to cards on mobile (<768px)

**Forms:**
- Input fields: Consistent height (h-10), rounded-md, border with focus ring in primary color
- Labels: Above inputs, text-sm font-medium, mb-2
- Error states: Red border, error text below in text-xs text-red-500
- Submit buttons: Primary color, full width on mobile, auto width on desktop

**Real-time Map Component:**
- Full section height (h-96 to h-[500px])
- Leaflet integration with custom vehicle markers
- Vehicle markers: Color-coded by status, clickable for vehicle details
- Legend: Fixed position bottom-right, translucent background
- Refresh indicator: Top-right corner showing last update time

**Route Slip Cards:**
- Compact card design showing date, driver, vehicle, payment status
- Color-coded left border based on status (pending/complete/duplicate)
- Action buttons in card footer (view details, add payment)
- Validation warnings displayed prominently with warning icon

**Payment Upload:**
- Drag-and-drop zone: Dashed border, hover state, centered icon and text
- File preview: Thumbnail for images, document icon for PDFs
- Upload progress: Linear progress bar below preview

**Authentication Pages:**
- Centered card: max-w-md, elevated shadow, p-8
- Logo placement: Centered above form
- Social proof: "Trusted by [X] drivers" below form (optional)
- Background: Subtle gradient or abstract geometric pattern

**Audit Log:**
- Timeline view: Vertical line connecting log entries
- Log entries: Card with timestamp, user avatar, action description
- Filterable by date range, user, action type
- Color-coded action types (create=blue, update=yellow, delete=red)

**Status Badges:**
- Pill shape: Rounded-full, px-3 py-1, text-xs font-medium
- Color backgrounds with dark text for accessibility
- Icons optional (check, warning, x)

## Visual Enhancements

**Animations:**
- Page transitions: Minimal fade-in (150ms)
- Loading states: Subtle pulse on skeleton screens
- GPS updates: Smooth marker transitions on map
- Hover states: 200ms transform scale(1.02) on cards

**Shadows & Depth:**
- Cards: shadow-sm (subtle)
- Modals/dropdowns: shadow-lg (pronounced)
- Active elements: shadow-md with primary color tint

**Iconography:**
- Use Heroicons (outline style for navigation, solid for status indicators)
- Consistent 20px (h-5 w-5) for inline icons
- 24px (h-6 w-6) for prominent icons in KPI cards

## Images

**Not Required:** This is a data-focused application where imagery would not enhance functionality. Focus on clear data visualization, tables, and the GPS map component as the primary visual element.

**GPS Map:** The real-time vehicle tracking map serves as the visual centerpiece of the dashboard, using Leaflet with custom markers for fleet visualization.