export interface ShortcutItem {
  id: string;
  label: string;
  shortcut: string;
  category: 'File' | 'Edit' | 'View' | 'Navigation' | 'Algorithms';
  description: string;
}

export const SHORTCUTS: ShortcutItem[] = [
  // File
  {
    id: 'open-image',
    label: 'Open Image…',
    shortcut: 'Ctrl+O',
    category: 'File',
    description: 'Open a local image file via file browser'
  },
  {
    id: 'load-calibration',
    label: 'Load Calibration Pattern',
    shortcut: '',
    category: 'File',
    description: 'Load standard benchmark test pattern with gradient, sphere, and stipples'
  },
  {
    id: 'copy-clipboard',
    label: 'Copy Result to Clipboard',
    shortcut: 'Ctrl+C',
    category: 'File',
    description: 'Copy processed dither canvas as lossless PNG directly to system clipboard'
  },
  {
    id: 'export-image',
    label: 'Export…',
    shortcut: 'Ctrl+E',
    category: 'File',
    description: 'Open Export dialog for multi-format raster, vector, or text grid export'
  },
  {
    id: 'close-image',
    label: 'Close Image',
    shortcut: '',
    category: 'File',
    description: 'Unload current image and return to empty canvas state'
  },

  // Edit
  {
    id: 'undo',
    label: 'Undo',
    shortcut: 'Ctrl+Z',
    category: 'Edit',
    description: 'Undo previous modification (Deferred to Phase 7.3)'
  },
  {
    id: 'redo',
    label: 'Redo',
    shortcut: 'Ctrl+Y',
    category: 'Edit',
    description: 'Redo previously undone modification (Deferred to Phase 7.3)'
  },
  {
    id: 'reset-adjustments',
    label: 'Reset Adjustments',
    shortcut: '',
    category: 'Edit',
    description: 'Reset brightness, contrast, saturation, gamma, and depth to defaults'
  },
  {
    id: 'reset-algo-params',
    label: 'Reset Algorithm Parameters',
    shortcut: '',
    category: 'Edit',
    description: 'Reset current algorithm parameters (threshold, scale, diffusion) to default'
  },
  {
    id: 'reset-all',
    label: 'Reset All',
    shortcut: '',
    category: 'Edit',
    description: 'Reset all application parameters, zoom, pan, and viewport adjustments'
  },

  // View
  {
    id: 'zoom-in',
    label: 'Zoom In',
    shortcut: 'Ctrl+=',
    category: 'View',
    description: 'Increase viewport canvas zoom by 20%'
  },
  {
    id: 'zoom-out',
    label: 'Zoom Out',
    shortcut: 'Ctrl+-',
    category: 'View',
    description: 'Decrease viewport canvas zoom by 20%'
  },
  {
    id: 'fit-viewport',
    label: 'Fit to Viewport',
    shortcut: '0',
    category: 'View',
    description: 'Scale canvas to fit within available center viewport bounds'
  },
  {
    id: 'actual-size',
    label: 'Actual Size',
    shortcut: '1',
    category: 'View',
    description: 'Reset viewport canvas zoom to 100% 1:1 pixel scale'
  },
  {
    id: 'toggle-compare',
    label: 'Toggle Compare',
    shortcut: '\\',
    category: 'View',
    description: 'Toggle before/after interactive split-screen comparison mode'
  },
  {
    id: 'toggle-fullscreen',
    label: 'Toggle Fullscreen',
    shortcut: 'F11',
    category: 'View',
    description: 'Toggle window full-screen mode'
  },

  // Navigation
  {
    id: 'menu-file',
    label: 'Open File Menu',
    shortcut: 'Alt+F',
    category: 'Navigation',
    description: 'Open the File dropdown menu'
  },
  {
    id: 'menu-edit',
    label: 'Open Edit Menu',
    shortcut: 'Alt+E',
    category: 'Navigation',
    description: 'Open the Edit dropdown menu'
  },
  {
    id: 'menu-view',
    label: 'Open View Menu',
    shortcut: 'Alt+V',
    category: 'Navigation',
    description: 'Open the View dropdown menu'
  },
  {
    id: 'menu-help',
    label: 'Open Help Menu',
    shortcut: 'Alt+H',
    category: 'Navigation',
    description: 'Open the Help dropdown menu'
  },
  {
    id: 'close-menu-dialog',
    label: 'Close Menu / Dialog',
    shortcut: 'Esc',
    category: 'Navigation',
    description: 'Close open menu dropdown or modal overlay and restore focus'
  },

  // Algorithms
  {
    id: 'prev-algo',
    label: 'Previous Algorithm',
    shortcut: '↑',
    category: 'Algorithms',
    description: 'Cycle to the previous algorithm in the active category'
  },
  {
    id: 'next-algo',
    label: 'Next Algorithm',
    shortcut: '↓',
    category: 'Algorithms',
    description: 'Cycle to the next algorithm in the active category'
  }
];

export const getShortcutLabel = (id: string): string => {
  const item = SHORTCUTS.find((s) => s.id === id);
  return item ? item.shortcut : '';
};
