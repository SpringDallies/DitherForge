// DitherForge 73-Algorithm Complete Engine
// Clean-room recreation of all 73 mathematical dithering algorithms from Dither Boy / Dither-girl.
// Dispatches all algorithms through the unified, high-performance engine.

import { dispatchDither, ALGORITHM_DISPATCH } from "./engine/index.js";

export const ALGORITHM_CATEGORIES = {
  basic: "Basic",
  error_diffusion: "Error Diffusion",
  glitch_effects: "Glitch Effects",
  ordered: "Ordered",
  patterned: "Patterned",
  polygon: "Polygon",
  special_effects: "Special Effects"
};

// Aliases for backward compatibility and snake_case / kebab-case interoperability
export const ALGORITHM_ALIASES = {
  'floyd_steinberg': 'floyd-steinberg',
  'sierra_3': 'sierra',
  'sierra_2': 'two-row-sierra',
  'sierra_lite': 'sierra-lite',
  'jarvis_judice_ninke': 'jarvis-judice-ninke',
  'stevenson_arce': 'stevenson-arce',
  'shiau_fan': 'atkinson',
  'shiau_fan_2': 'burkes',
  'false_floyd_steinberg': 'floyd-steinberg',
  'minimized_avg_error': 'burkes',
  'dynamic_serpentine': 'floyd-steinberg',
  'fan': 'atkinson',
  'bayer_2x2': 'bayer-matrix',
  'bayer_4x4': 'bayer-matrix',
  'bayer_8x8': 'bayer-matrix',
  'bayer_16x16': 'bayer-matrix',
  'clustered_dot': 'mosaic',
  'checkered': 'checkers',
  'horizontal_lines': 'uniform-modulation-x',
  'vertical_lines': 'uniform-modulation-y',
  'diagonal_hatch': 'diagonal',
  'concentric_diamond': 'diamond',
  'woven_basket': 'crosshatch',
  'hex_stipple': 'stippling',
  'scanline_jitter': 'atkinson-vhs',
  'chromatic_offset': 'color-separation',
  'pixel_sorting': 'glitch',
  'digital_artifacts': 'artifact-modulation-glitch',
  'interlacing_tear': 'waveform',
  'crt_bloom': 'smooth-diffuse',
  'bit_crush': 'bit-tone',
  'vhs_tracking': 'atkinson-vhs',
  'bad_ram': 'artifact-modulation-glitch',
  'wave_distortion': 'wave-modulation-x',
  'quant_slice': 'uniform-modulation-x',
  'matrix_rake': 'uniform-modulation-y',
  'static_snow': 'noise',
  'sync_pulse_loss': 'waveform-alt',
  'feedback_ringing': 'contrast-aware-x',
  'chroma_subsample': 'color-separation',
  'moire_glitch': 'wave-modulation-y',
  'fixed_threshold': 'thresholder',
  'random_threshold': 'random-ordered',
  'blue_noise': 'noise',
  'gaussian_noise': 'noise',
  'perlin_gradient': 'topography',
  'riemersma': 'fractal-diffuse',
  'ostromoukhov': 'ostromukhov',
  'tpdf_noise': 'noise',
  'companding_curve': 'smooth-diffuse',
  'spatial_lattice': 'hexa-poly',
  'sobel_feature': 'diagonal',
  'laplacian_mod': 'contrast-aware-x',
  'directional_gradient': 'diagonal',
  'voronoi_cellular': 'low-poly',
  'diffusion_blur': 'smooth-diffuse',
  'quantum_stipple': 'stippling',
  'ignition_glow': 'radial-peaks',
  'temporal_kinetic': 'wave',
  'gaussian_diffusion': 'gaussian'
};

export const ALGORITHM_REGISTRY = [
  {
    "id": "color-separation",
    "name": "Color Separation",
    "category": "basic",
    "description": "Pure color quantization with no dithering - maps pixels to nearest palette color",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": false,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "none",
    "name": "Original",
    "category": "basic",
    "description": "No dithering - preserves original image with palette colors",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": false,
      "supportsColorDepth": false,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "artifact-modulation",
    "name": "Artifact Modulation",
    "category": "error_diffusion",
    "description": "Uniform-weight error diffusion creating distinctive artifact patterns",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": false
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower values = more contrast, higher values = more error diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "atkinson",
    "name": "Atkinson",
    "category": "error_diffusion",
    "description": "High-contrast error diffusion with distinctive Macintosh-style aesthetics",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern (non-traditional for Atkinson)",
        "tooltip": "Classic Atkinson uses left-to-right only, but serpentine can reduce artifacts",
        "defaultValue": false
      },
      {
        "id": "errorReduction",
        "label": "Error Reduction",
        "type": "slider",
        "min": 0.5,
        "max": 2,
        "step": 0.1,
        "defaultValue": 1,
        "description": "Controls the intentional error loss (1.0 = classic 75% error retention)",
        "tooltip": "Higher values create more contrast, lower values closer to Floyd-Steinberg",
        "unit": "x",
        "shuffleRange": {
          "min": 0.8,
          "max": 1.5
        }
      }
    ]
  },
  {
    "id": "burkes",
    "name": "Burkes",
    "category": "error_diffusion",
    "description": "Wide horizontal error distribution with balanced quality",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "cracked-diffuse",
    "name": "Cracked Diffuse",
    "category": "error_diffusion",
    "description": "Directional error diffusion creating non-crossing H/V lines with optional crack overlap",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "cracked",
        "label": "Cracked",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 100,
        "description": "Cross-directional overlap intensity",
        "tooltip": "0 = non-crossing lines, 100 = full crack-like overlap",
        "shuffleRange": {
          "min": 0,
          "max": 75
        }
      }
    ]
  },
  {
    "id": "floyd-steinberg",
    "name": "Floyd-Steinberg",
    "category": "error_diffusion",
    "description": "Classic error diffusion algorithm with excellent quality and wide adoption",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "fractal-diffuse",
    "name": "Fractal Diffuse",
    "category": "error_diffusion",
    "description": "Space-filling curve error propagation eliminating directional banding",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "strength",
        "label": "Strength",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 75,
        "description": "Error propagation strength along the curve",
        "tooltip": "0 = no error propagation, 100 = full propagation",
        "shuffleRange": {
          "min": 40,
          "max": 90
        }
      }
    ]
  },
  {
    "id": "gaussian",
    "name": "Gaussian",
    "category": "error_diffusion",
    "description": "Error diffusion with Gaussian noise and 5x5 kernel for organic patterns",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "distributionSpread",
        "label": "Distribution Spread",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Controls the spread of error distribution and noise",
        "tooltip": "Higher values create more diffuse, organic patterns",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "jarvis-judice-ninke",
    "name": "Jarvis-Judice-Ninke",
    "category": "error_diffusion",
    "description": "High-quality error diffusion with extensive 3-row distribution",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "ostromukhov",
    "name": "Ostromukhov",
    "category": "error_diffusion",
    "description": "Adaptive error diffusion with variable coefficients for superior tonal reproduction",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "sierra-lite",
    "name": "Sierra Lite",
    "category": "error_diffusion",
    "description": "Fast minimal error diffusion for real-time applications",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "sierra",
    "name": "Sierra",
    "category": "error_diffusion",
    "description": "Two-row error diffusion with balanced quality and performance",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "stevenson-arce",
    "name": "Stevenson-Arce",
    "category": "error_diffusion",
    "description": "Wide 4-row error distribution for photographic quality",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "stucki",
    "name": "Stucki",
    "category": "error_diffusion",
    "description": "High-quality error diffusion with excellent artifact reduction",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "two-row-sierra",
    "name": "Two-Row Sierra",
    "category": "error_diffusion",
    "description": "Mid-weight Sierra variant balancing speed and quality",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Use zigzag scanning pattern to reduce directional artifacts",
        "tooltip": "Alternates left-to-right and right-to-left scanning per row",
        "defaultValue": true
      },
      {
        "id": "errorStrength",
        "label": "Error Strength",
        "type": "slider",
        "min": 0,
        "max": 200,
        "step": 5,
        "defaultValue": 100,
        "description": "Controls error diffusion intensity",
        "tooltip": "Lower = more contrast, Higher = more diffusion",
        "unit": "%",
        "shuffleRange": {
          "min": 50,
          "max": 150
        }
      }
    ]
  },
  {
    "id": "vortex-diffusion",
    "name": "Vortex Diffusion",
    "category": "error_diffusion",
    "description": "Spiral-transformed error diffusion for swirling, vortex effects",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "twistStrength",
        "label": "Twist Strength",
        "type": "slider",
        "min": -100,
        "max": 100,
        "step": 5,
        "defaultValue": 0,
        "description": "Controls the spiral twist intensity",
        "tooltip": "Negative values twist counter-clockwise, positive clockwise",
        "shuffleRange": {
          "min": -50,
          "max": 50
        }
      },
      {
        "id": "spiralFrequency",
        "label": "Spiral Frequency",
        "type": "slider",
        "min": 1,
        "max": 10,
        "step": 1,
        "defaultValue": 5,
        "description": "Controls the spiral tightness",
        "tooltip": "Higher values create tighter, more dramatic spirals",
        "shuffleRange": {
          "min": 3,
          "max": 8
        }
      }
    ]
  },
  {
    "id": "artifact-modulation-glitch",
    "name": "Artifact Modulation (Glitch)",
    "category": "glitch_effects",
    "description": "Horizontal-only diffusion creating VHS streaming artifacts",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 10,
        "step": 1,
        "defaultValue": 5,
        "description": "Contrast/line intensity",
        "shuffleRange": {
          "min": 3,
          "max": 8
        }
      }
    ]
  },
  {
    "id": "atkinson-line-modulation",
    "name": "Atkinson Line Modulation",
    "category": "glitch_effects",
    "description": "Modulated Atkinson diffusion with scanning artifacts",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": false,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "modulationStrength",
        "label": "Modulation Strength",
        "type": "slider",
        "min": 1,
        "max": 10,
        "step": 1,
        "defaultValue": 5,
        "description": "Strength of sine modulation",
        "shuffleRange": {
          "min": 3,
          "max": 8
        }
      },
      {
        "id": "horizontalBias",
        "label": "Horizontal Bias",
        "type": "slider",
        "min": 1,
        "max": 10,
        "step": 1,
        "defaultValue": 5,
        "description": "Horizontal error diffusion emphasis",
        "shuffleRange": {
          "min": 3,
          "max": 8
        }
      }
    ]
  },
  {
    "id": "atkinson-vhs",
    "name": "Atkinson-VHS",
    "category": "glitch_effects",
    "description": "VHS tape glitch effect with horizontal artifacts",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineCount",
        "label": "Line Count",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Number of VHS glitch lines",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "contrast-aware-x",
    "name": "Contrast Aware X",
    "category": "glitch_effects",
    "description": "Vertical 1D diffusion with local contrast adaptation",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast and warp intensity",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "contrast-aware-y",
    "name": "Contrast Aware Y",
    "category": "glitch_effects",
    "description": "Horizontal 1D diffusion with local contrast adaptation",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast and warp intensity",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "glitch",
    "name": "Glitch",
    "category": "glitch_effects",
    "description": "VHS/digital glitch effects with random corruption artifacts",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "glitchIntensity",
        "label": "Glitch Intensity",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Intensity of glitch corruption",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "modulated-diffuse-x",
    "name": "Modulated Diffuse X",
    "category": "glitch_effects",
    "description": "Vertical 1D error diffusion with contrast",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast adjustment",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "modulated-diffuse-y",
    "name": "Modulated Diffuse Y",
    "category": "glitch_effects",
    "description": "Horizontal 1D error diffusion with contrast",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast adjustment",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "ordered-modulation",
    "name": "Ordered Modulation",
    "category": "glitch_effects",
    "description": "Serpentine diffusion with wavy 1D Bayer threshold",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 5,
        "description": "Wave amplitude and contrast",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "smooth-diffuse",
    "name": "Smooth Diffuse",
    "category": "glitch_effects",
    "description": "1D horizontal error diffusion with smoothing",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 10,
        "step": 1,
        "defaultValue": 5,
        "description": "Contrast adjustment",
        "shuffleRange": {
          "min": 3,
          "max": 8
        }
      },
      {
        "id": "smoothness",
        "label": "Smoothness",
        "type": "slider",
        "min": 1,
        "max": 10,
        "step": 1,
        "defaultValue": 5,
        "description": "Error attenuation factor",
        "shuffleRange": {
          "min": 3,
          "max": 8
        }
      }
    ]
  },
  {
    "id": "stucki-diffusion-lines",
    "name": "Stucki Diffusion Lines",
    "category": "glitch_effects",
    "description": "Stucki diffusion with horizontal line emphasis",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineEmphasis",
        "label": "Line Emphasis",
        "type": "slider",
        "min": 1,
        "max": 10,
        "step": 1,
        "defaultValue": 5,
        "description": "Horizontal diffusion emphasis",
        "shuffleRange": {
          "min": 3,
          "max": 8
        }
      }
    ]
  },
  {
    "id": "uniform-modulation-x",
    "name": "Uniform Modulation X",
    "category": "glitch_effects",
    "description": "Vertical 1D diffusion with horizontal bleed and EMA smoothing",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast adjustment",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      },
      {
        "id": "smoothingFactor",
        "label": "Smoothing Factor",
        "type": "toggle",
        "defaultValue": false,
        "description": "Enable bleed (OFF=no bleed, ON=full bleed)"
      },
      {
        "id": "bleedFraction",
        "label": "Bleed Fraction",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Horizontal bleed amount (0-100%)",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      }
    ]
  },
  {
    "id": "uniform-modulation-y",
    "name": "Uniform Modulation Y",
    "category": "glitch_effects",
    "description": "Horizontal 1D diffusion with vertical bleed and EMA smoothing",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast adjustment",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      },
      {
        "id": "smoothingFactor",
        "label": "Smoothing Factor",
        "type": "toggle",
        "defaultValue": false,
        "description": "Enable bleed (OFF=no bleed, ON=full bleed)"
      },
      {
        "id": "bleedFraction",
        "label": "Bleed Fraction",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Vertical bleed amount (0-100%)",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      }
    ]
  },
  {
    "id": "wave-modulation-x",
    "name": "Wave Modulation X",
    "category": "glitch_effects",
    "description": "Vertical error carry with sinusoidal weight creating horizontal rhythmic bands",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "frequency",
        "label": "Frequency",
        "type": "slider",
        "min": 1,
        "max": 30,
        "step": 1,
        "defaultValue": 5,
        "description": "Modulation cycles per column",
        "tooltip": "More cycles = tighter band spacing",
        "shuffleRange": {
          "min": 2,
          "max": 15
        }
      },
      {
        "id": "amplitude",
        "label": "Amplitude",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 50,
        "description": "Modulation depth",
        "tooltip": "0 = constant weight, 100 = full swing from 0 to 1",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      }
    ]
  },
  {
    "id": "wave-modulation-y",
    "name": "Wave Modulation Y",
    "category": "glitch_effects",
    "description": "Horizontal error carry with sinusoidal weight creating vertical rhythmic bands",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "frequency",
        "label": "Frequency",
        "type": "slider",
        "min": 1,
        "max": 30,
        "step": 1,
        "defaultValue": 5,
        "description": "Modulation cycles per row",
        "tooltip": "More cycles = tighter band spacing",
        "shuffleRange": {
          "min": 2,
          "max": 15
        }
      },
      {
        "id": "amplitude",
        "label": "Amplitude",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 50,
        "description": "Modulation depth",
        "tooltip": "0 = constant weight, 100 = full swing from 0 to 1",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      }
    ]
  },
  {
    "id": "waveform-alt",
    "name": "Waveform Alt",
    "category": "glitch_effects",
    "description": "Enhanced waveform with gradient-based modulation",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "modulationBlend",
        "label": "Modulation Blend",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Blend between frequency and amplitude modulation",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "waveform",
    "name": "Waveform",
    "category": "glitch_effects",
    "description": "Content-aware frequency-modulated wave pattern",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "waveDensity",
        "label": "Wave Density",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Base frequency of waveform",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "bayer-matrix",
    "name": "Bayer Matrix",
    "category": "ordered",
    "description": "Classic ordered dithering with selectable matrix sizes",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "matrixSize",
        "label": "Matrix Size",
        "type": "dropdown",
        "options": [
          {
            "value": "2x2",
            "label": "2x2 (Coarse)"
          },
          {
            "value": "4x4",
            "label": "4x4 (Standard)"
          },
          {
            "value": "8x8",
            "label": "8x8 (Fine)"
          },
          {
            "value": "16x16",
            "label": "16x16 (Very Fine)"
          }
        ],
        "defaultValue": "4x4",
        "description": "Size of the Bayer threshold matrix",
        "tooltip": "Larger matrices produce finer, smoother patterns"
      }
    ]
  },
  {
    "id": "bayer-void",
    "name": "Bayer-Void",
    "category": "ordered",
    "description": "CRT-warped ordered dithering with quadratic horizontal distortion",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "warpIntensity",
        "label": "Warp Intensity",
        "type": "slider",
        "min": 1,
        "max": 200,
        "step": 1,
        "defaultValue": 10,
        "description": "Intensity of CRT-style horizontal warp",
        "tooltip": "Higher values create stronger distortion at bottom of image",
        "shuffleRange": {
          "min": 5,
          "max": 100
        }
      }
    ]
  },
  {
    "id": "bit-tone",
    "name": "Bit Tone",
    "category": "ordered",
    "description": "Halftone-style ordered dithering with adjustable dot size",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "dotSize",
        "label": "Dot Size",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Size of halftone dots",
        "tooltip": "Larger values create coarser halftone patterns",
        "shuffleRange": {
          "min": 2,
          "max": 8
        }
      }
    ]
  },
  {
    "id": "mosaic",
    "name": "Mosaic",
    "category": "ordered",
    "description": "Block-averaged dithering creating mosaic tile effect",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "blockSize",
        "label": "Block Size",
        "type": "slider",
        "min": 1,
        "max": 50,
        "step": 1,
        "defaultValue": 10,
        "description": "Size of mosaic tiles",
        "tooltip": "Larger values create bigger, more visible tiles",
        "shuffleRange": {
          "min": 5,
          "max": 25
        }
      }
    ]
  },
  {
    "id": "random-ordered",
    "name": "Random Ordered",
    "category": "ordered",
    "description": "Stochastic ordered dithering with random thresholds",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "block-tone",
    "name": "Block Tone",
    "category": "patterned",
    "description": "Classic halftone dithering with circular dot patterns",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "dotSize",
        "label": "Dot Size",
        "type": "slider",
        "min": 4,
        "max": 30,
        "step": 1,
        "defaultValue": 4,
        "description": "Size of halftone cells/dots",
        "tooltip": "Larger values create bigger, more visible halftone dots",
        "shuffleRange": {
          "min": 6,
          "max": 15
        }
      }
    ]
  },
  {
    "id": "camo",
    "name": "Camo",
    "category": "patterned",
    "description": "Jittered Voronoi cells create a stained-glass mosaic quantization",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "density",
        "label": "Density",
        "type": "slider",
        "min": 3,
        "max": 100,
        "step": 1,
        "defaultValue": 30,
        "description": "Cell density (more = smaller cells)",
        "tooltip": "Low values produce large tiles, high values produce fine mosaic",
        "shuffleRange": {
          "min": 10,
          "max": 60
        }
      }
    ]
  },
  {
    "id": "checkers",
    "name": "Checkers",
    "category": "patterned",
    "description": "Checkerboard pattern dithering with adjustable block sizes",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "checkersSize",
        "label": "Pattern Size",
        "type": "dropdown",
        "options": [
          {
            "value": "small",
            "label": "Small (2x2)"
          },
          {
            "value": "medium",
            "label": "Medium (6x6)"
          },
          {
            "value": "large",
            "label": "Large (10x10)"
          }
        ],
        "defaultValue": "medium",
        "description": "Size of checkerboard blocks",
        "tooltip": "Larger blocks create more visible checkerboard patterns"
      }
    ]
  },
  {
    "id": "circle-grid",
    "name": "Circle Grid",
    "category": "patterned",
    "description": "Flat solid-color circles on a regular grid",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "crosshatch",
    "name": "Crosshatch",
    "category": "patterned",
    "description": "Pen-and-ink style crosshatch patterns with progressive line density",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineSpacing",
        "label": "Line Spacing",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Spacing between crosshatch lines",
        "tooltip": "Larger values create wider gaps between lines",
        "shuffleRange": {
          "min": 2,
          "max": 10
        }
      }
    ]
  },
  {
    "id": "diamond-grid",
    "name": "Diamond Grid",
    "category": "patterned",
    "description": "Flat solid-color diamonds on a regular grid",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "diamond",
    "name": "Diamond",
    "category": "patterned",
    "description": "Manhattan distance-based diamond pattern dithering",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "period",
        "label": "Pattern Period",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 8,
        "description": "Size of diamond pattern repetition",
        "tooltip": "Larger values create bigger diamond patterns",
        "shuffleRange": {
          "min": 4,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "gridlock-traffic",
    "name": "Gridlock/Traffic",
    "category": "patterned",
    "description": "Diagonal grid pattern creating traffic-inspired appearance",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "heart-grid",
    "name": "Heart Grid",
    "category": "patterned",
    "description": "Flat solid-color hearts on a regular grid",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "pop-tone",
    "name": "Pop Tone",
    "category": "patterned",
    "description": "Pop art-era dot pattern - circular dots sized by luminance on a fixed grid",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "density",
        "label": "Density",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 20,
        "description": "Midtone darkening intensity",
        "unit": "%"
      },
      {
        "id": "variation",
        "label": "Variation",
        "type": "slider",
        "min": 0,
        "max": 90,
        "step": 1,
        "defaultValue": 45,
        "description": "Rotation angle for sample grid",
        "unit": "°"
      }
    ]
  },
  {
    "id": "print-pattern",
    "name": "Print Pattern",
    "category": "patterned",
    "description": "CMYK-style angled halftone grid simulation",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "dotScale",
        "label": "Dot Scale",
        "type": "slider",
        "min": 3,
        "max": 20,
        "step": 1,
        "defaultValue": 8,
        "description": "Size of halftone dot grid",
        "tooltip": "Larger values create bigger, more visible dots",
        "shuffleRange": {
          "min": 5,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "square-mosaic",
    "name": "Square Mosaic",
    "category": "patterned",
    "description": "Square tiles with visible gaps creating a mosaic effect",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "stippling",
    "name": "Stippling",
    "category": "patterned",
    "description": "Pointillist random dot pattern with density-based darkness",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "dotDensity",
        "label": "Dot Density",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Density of stipple dots",
        "tooltip": "Higher values create more dots overall",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "hexa-poly",
    "name": "Hexa-Poly",
    "category": "polygon",
    "description": "Honeycomb hexagon tessellation with flat solid colors",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "low-poly",
    "name": "Low-Poly",
    "category": "polygon",
    "description": "Tessellating triangles with selectable geometry for low-poly illustration style",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "triangleType",
        "label": "Triangle Type",
        "type": "dropdown",
        "options": [
          {
            "value": "isosceles",
            "label": "Isosceles"
          },
          {
            "value": "pyramid",
            "label": "Pyramid (Equilateral)"
          },
          {
            "value": "sawtooth",
            "label": "Sawtooth (45-45-90)"
          },
          {
            "value": "half-equilateral",
            "label": "Half-Equilateral (30-60-90)"
          },
          {
            "value": "golden-triangle",
            "label": "Golden Triangle (36-72-72)"
          },
          {
            "value": "arrowhead",
            "label": "Arrowhead (108-36-36)"
          }
        ],
        "defaultValue": "isosceles",
        "description": "Shape of triangles used in the tessellation",
        "tooltip": "Each type produces a distinct visual pattern while maintaining perfect tessellation"
      }
    ]
  },
  {
    "id": "penta-poly",
    "name": "Penta-Poly",
    "category": "polygon",
    "description": "Tessellating pentagons from a hex grid split",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "vertical",
        "label": "Vertical Split",
        "type": "toggle",
        "description": "Split hexagons vertically into left/right pentagons instead of upper/lower",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "tri-poly",
    "name": "Tri-Poly",
    "category": "polygon",
    "description": "Alternating up/down triangles tessellating the image",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "beehive",
    "name": "Beehive",
    "category": "special_effects",
    "description": "Hexagonal tiling with Bayer sub-scatter for honeycomb dithering",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "cellSize",
        "label": "Cell Size",
        "type": "slider",
        "min": 2,
        "max": 40,
        "step": 1,
        "defaultValue": 8,
        "description": "Hex cell diameter in blocks",
        "tooltip": "Smaller = finer honeycomb, larger = coarser tiles",
        "shuffleRange": {
          "min": 4,
          "max": 20
        }
      }
    ]
  },
  {
    "id": "diagonal",
    "name": "Diagonal",
    "category": "special_effects",
    "description": "Edge-detection wireframe effect with Sobel operator",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "edgeSensitivity",
        "label": "Edge Sensitivity",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Sensitivity of edge detection",
        "tooltip": "Higher values detect more subtle edges",
        "shuffleRange": {
          "min": 2,
          "max": 10
        }
      }
    ]
  },
  {
    "id": "displace-contour",
    "name": "Displace Contour",
    "category": "special_effects",
    "description": "Displaced contour lines with variable thickness creating topographic effect",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "contourThreshold",
        "label": "Contour Threshold",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 5,
        "defaultValue": 50,
        "description": "Displacement amount for contours",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      },
      {
        "id": "lineMode",
        "label": "Line Mode",
        "type": "slider",
        "min": 1,
        "max": 3,
        "step": 1,
        "defaultValue": 1,
        "description": "Thickness multiplier for contour lines",
        "shuffleRange": {
          "min": 1,
          "max": 3
        }
      },
      {
        "id": "smoothing",
        "label": "Smoothing",
        "type": "slider",
        "min": 0,
        "max": 5,
        "step": 1,
        "defaultValue": 0,
        "description": "Gaussian blur radius before contour detection",
        "shuffleRange": {
          "min": 0,
          "max": 3
        }
      },
      {
        "id": "lineSpacing",
        "label": "Line Spacing",
        "type": "slider",
        "min": 1,
        "max": 5,
        "step": 1,
        "defaultValue": 1,
        "description": "Vertical spacing between contour lines",
        "shuffleRange": {
          "min": 1,
          "max": 3
        }
      }
    ]
  },
  {
    "id": "dotted-lines",
    "name": "Dotted Lines",
    "category": "special_effects",
    "description": "Smooth wave-field threshold dithering producing flowing contour lines",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineDensity",
        "label": "Line Density",
        "type": "slider",
        "min": 1,
        "max": 30,
        "step": 1,
        "defaultValue": 10,
        "description": "Number of contour lines across the image",
        "shuffleRange": {
          "min": 4,
          "max": 20
        }
      },
      {
        "id": "dotting",
        "label": "Dotting",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 40,
        "description": "Secondary wave strength bending the lines",
        "shuffleRange": {
          "min": 10,
          "max": 80
        }
      },
      {
        "id": "lineAngle",
        "label": "Line Angle",
        "type": "dial",
        "min": 0,
        "max": 360,
        "step": 1,
        "defaultValue": 45,
        "description": "Rotation of the primary line direction",
        "unit": "°",
        "shuffleRange": {
          "min": 0,
          "max": 360
        }
      }
    ]
  },
  {
    "id": "noise",
    "name": "Noise",
    "category": "special_effects",
    "description": "Pure random noise-based stochastic dithering",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": []
  },
  {
    "id": "orb-diffuse-x",
    "name": "Orb Diffuse X",
    "category": "special_effects",
    "description": "Soft orb overlay with vertical 1D error diffusion",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast adjustment for diffusion",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      },
      {
        "id": "orbCount",
        "label": "Orb Count",
        "type": "slider",
        "min": 1,
        "max": 50,
        "step": 1,
        "defaultValue": 8,
        "description": "Number of soft white orbs",
        "shuffleRange": {
          "min": 3,
          "max": 20
        }
      },
      {
        "id": "orbSize",
        "label": "Orb Size",
        "type": "slider",
        "min": 10,
        "max": 400,
        "step": 10,
        "defaultValue": 80,
        "description": "Base radius of orbs in pixels",
        "shuffleRange": {
          "min": 30,
          "max": 200
        }
      },
      {
        "id": "orbIntensity",
        "label": "Orb Intensity",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 5,
        "defaultValue": 60,
        "description": "How strongly the orbs brighten toward white",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      },
      {
        "id": "orbRandom",
        "label": "Orb Random",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Randomizes orb placement",
        "shuffleRange": {
          "min": 0,
          "max": 100
        }
      },
      {
        "id": "orbOffset",
        "label": "Orb Offset",
        "type": "slider",
        "min": -100,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Slides all orbs along the chosen axis",
        "shuffleRange": {
          "min": -50,
          "max": 50
        }
      },
      {
        "id": "orbVertical",
        "label": "Orb Direction",
        "type": "toggle",
        "description": "OFF = offset moves orbs left/right, ON = up/down",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "orb-diffuse-y",
    "name": "Orb Diffuse Y",
    "category": "special_effects",
    "description": "Soft orb overlay with horizontal 1D error diffusion",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "lineScale",
        "label": "Line Scale",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Contrast adjustment for diffusion",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      },
      {
        "id": "orbCount",
        "label": "Orb Count",
        "type": "slider",
        "min": 1,
        "max": 50,
        "step": 1,
        "defaultValue": 8,
        "description": "Number of soft white orbs",
        "shuffleRange": {
          "min": 3,
          "max": 20
        }
      },
      {
        "id": "orbSize",
        "label": "Orb Size",
        "type": "slider",
        "min": 10,
        "max": 400,
        "step": 10,
        "defaultValue": 80,
        "description": "Base radius of orbs in pixels",
        "shuffleRange": {
          "min": 30,
          "max": 200
        }
      },
      {
        "id": "orbIntensity",
        "label": "Orb Intensity",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 5,
        "defaultValue": 60,
        "description": "How strongly the orbs brighten toward white",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      },
      {
        "id": "orbRandom",
        "label": "Orb Random",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Randomizes orb placement",
        "shuffleRange": {
          "min": 0,
          "max": 100
        }
      },
      {
        "id": "orbOffset",
        "label": "Orb Offset",
        "type": "slider",
        "min": -100,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Slides all orbs along the chosen axis",
        "shuffleRange": {
          "min": -50,
          "max": 50
        }
      },
      {
        "id": "orbVertical",
        "label": "Orb Direction",
        "type": "toggle",
        "description": "OFF = offset moves orbs left/right, ON = up/down",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "orb-diffuse",
    "name": "Orb Diffuse",
    "category": "special_effects",
    "description": "Error diffusion with soft white orb overlay layer",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "serpentine",
        "label": "Serpentine Scan",
        "type": "toggle",
        "description": "Zigzag scanning to reduce directional artifacts",
        "tooltip": "Alternates scan direction per row",
        "defaultValue": true
      },
      {
        "id": "orbCount",
        "label": "Orb Count",
        "type": "slider",
        "min": 1,
        "max": 50,
        "step": 1,
        "defaultValue": 8,
        "description": "Number of soft white orbs",
        "shuffleRange": {
          "min": 3,
          "max": 20
        }
      },
      {
        "id": "orbSize",
        "label": "Orb Size",
        "type": "slider",
        "min": 10,
        "max": 400,
        "step": 10,
        "defaultValue": 80,
        "description": "Base radius of orbs in pixels",
        "shuffleRange": {
          "min": 30,
          "max": 200
        }
      },
      {
        "id": "orbIntensity",
        "label": "Orb Intensity",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 5,
        "defaultValue": 60,
        "description": "How strongly the orbs brighten toward white",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      },
      {
        "id": "orbRandom",
        "label": "Orb Random",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Randomizes orb placement",
        "shuffleRange": {
          "min": 0,
          "max": 100
        }
      },
      {
        "id": "orbOffset",
        "label": "Orb Offset",
        "type": "slider",
        "min": -100,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Slides all orbs along the chosen axis",
        "shuffleRange": {
          "min": -50,
          "max": 50
        }
      },
      {
        "id": "orbVertical",
        "label": "Orb Direction",
        "type": "toggle",
        "description": "OFF = offset moves orbs left/right, ON = up/down",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "orb-matrix",
    "name": "Orb Matrix",
    "category": "special_effects",
    "description": "Soft orb overlay with Bayer matrix ordered dithering",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "matrixSize",
        "label": "Matrix Size",
        "type": "dropdown",
        "options": [
          {
            "value": "2x2",
            "label": "2x2 (Coarse)"
          },
          {
            "value": "4x4",
            "label": "4x4 (Standard)"
          },
          {
            "value": "8x8",
            "label": "8x8 (Fine)"
          },
          {
            "value": "16x16",
            "label": "16x16 (Very Fine)"
          }
        ],
        "defaultValue": "4x4",
        "description": "Size of the Bayer threshold matrix"
      },
      {
        "id": "orbCount",
        "label": "Orb Count",
        "type": "slider",
        "min": 1,
        "max": 50,
        "step": 1,
        "defaultValue": 8,
        "description": "Number of soft white orbs",
        "shuffleRange": {
          "min": 3,
          "max": 20
        }
      },
      {
        "id": "orbSize",
        "label": "Orb Size",
        "type": "slider",
        "min": 10,
        "max": 400,
        "step": 10,
        "defaultValue": 80,
        "description": "Base radius of orbs in pixels",
        "shuffleRange": {
          "min": 30,
          "max": 200
        }
      },
      {
        "id": "orbIntensity",
        "label": "Orb Intensity",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 5,
        "defaultValue": 60,
        "description": "How strongly the orbs brighten toward white",
        "shuffleRange": {
          "min": 20,
          "max": 80
        }
      },
      {
        "id": "orbRandom",
        "label": "Orb Random",
        "type": "slider",
        "min": 0,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Randomizes orb placement",
        "shuffleRange": {
          "min": 0,
          "max": 100
        }
      },
      {
        "id": "orbOffset",
        "label": "Orb Offset",
        "type": "slider",
        "min": -100,
        "max": 100,
        "step": 1,
        "defaultValue": 0,
        "description": "Slides all orbs along the chosen axis",
        "shuffleRange": {
          "min": -50,
          "max": 50
        }
      },
      {
        "id": "orbVertical",
        "label": "Orb Direction",
        "type": "toggle",
        "description": "OFF = offset moves orbs left/right, ON = up/down",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "radial-burst",
    "name": "Radial Burst",
    "category": "special_effects",
    "description": "Radial burst pattern with concentric circular waves",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "divisor",
        "label": "Divisor",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 5,
        "description": "Frequency of radial burst pattern",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "radial-peaks",
    "name": "Radial Peaks",
    "category": "special_effects",
    "description": "Concentric radial rings emanating from detected high-luminance cores",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "peakThreshold",
        "label": "Peak Threshold",
        "type": "slider",
        "min": 0,
        "max": 50,
        "step": 1,
        "defaultValue": 50,
        "description": "Minimum brightness to qualify as a radial center",
        "shuffleRange": {
          "min": 10,
          "max": 50
        }
      },
      {
        "id": "minPeakDistance",
        "label": "Min Peak Distance",
        "type": "slider",
        "min": 10,
        "max": 400,
        "step": 10,
        "defaultValue": 60,
        "description": "Minimum pixel distance between detected peaks",
        "shuffleRange": {
          "min": 30,
          "max": 200
        }
      },
      {
        "id": "maxPeaks",
        "label": "Max Peaks",
        "type": "slider",
        "min": 1,
        "max": 50,
        "step": 1,
        "defaultValue": 20,
        "description": "Maximum number of radial centers to detect",
        "shuffleRange": {
          "min": 3,
          "max": 30
        }
      },
      {
        "id": "divisor",
        "label": "Ring Frequency",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 5,
        "description": "Spacing of concentric rings (lower = tighter)",
        "shuffleRange": {
          "min": 2,
          "max": 14
        }
      },
      {
        "id": "interference",
        "label": "Interference",
        "type": "toggle",
        "description": "Blend all peaks (interference) instead of nearest-peak only",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "sine-distort",
    "name": "Sine Distort",
    "category": "special_effects",
    "description": "Dual sine-wave superposition creating moire interference patterns",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "freqA",
        "label": "Frequency A",
        "type": "slider",
        "min": 1,
        "max": 30,
        "step": 1,
        "defaultValue": 8,
        "description": "Horizontal wave frequency",
        "tooltip": "Cycles across the image for the first wave",
        "shuffleRange": {
          "min": 3,
          "max": 20
        }
      },
      {
        "id": "freqB",
        "label": "Frequency B",
        "type": "slider",
        "min": 1,
        "max": 30,
        "step": 1,
        "defaultValue": 12,
        "description": "Angled wave frequency",
        "tooltip": "Cycles across the image for the second wave",
        "shuffleRange": {
          "min": 3,
          "max": 20
        }
      },
      {
        "id": "angle",
        "label": "Angle",
        "type": "dial",
        "min": 0,
        "max": 360,
        "step": 1,
        "defaultValue": 45,
        "description": "Angle offset of wave B",
        "tooltip": "0 = parallel waves, 90 = perpendicular. Pattern repeats at 180°",
        "unit": "°",
        "shuffleRange": {
          "min": 0,
          "max": 360
        }
      }
    ]
  },
  {
    "id": "sine-wave-modulation",
    "name": "Sine Wave Modulation",
    "category": "special_effects",
    "description": "Dual sine wave modulation with content-aware patterns",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": false,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "waveFrequency",
        "label": "Wave Frequency",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 5,
        "description": "Frequency of sine wave oscillation",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      },
      {
        "id": "waveThreshold",
        "label": "Wave Threshold",
        "type": "slider",
        "min": 1,
        "max": 30,
        "step": 1,
        "defaultValue": 10,
        "description": "Amplitude of wave modulation",
        "shuffleRange": {
          "min": 5,
          "max": 20
        }
      }
    ]
  },
  {
    "id": "thresholder",
    "name": "Thresholder",
    "category": "special_effects",
    "description": "Multi-sine wave threshold modulation with content awareness",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "modulationFrequency",
        "label": "Modulation Frequency",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Frequency of sine wave modulations",
        "tooltip": "Higher values create more frequent oscillations",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "topography",
    "name": "Topography",
    "category": "special_effects",
    "description": "Topographic contour map effect with analog warping",
    "complexity": "complex",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "warpIntensity",
        "label": "Warp Intensity",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 1,
        "description": "Intensity of topographic warping",
        "shuffleRange": {
          "min": 3,
          "max": 10
        }
      }
    ]
  },
  {
    "id": "vortex",
    "name": "Vortex",
    "category": "special_effects",
    "description": "Spiral vortex pattern using polar sine waves",
    "complexity": "moderate",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "swirl",
        "label": "Swirl Intensity",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 5,
        "description": "Intensity of vortex spiral",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  },
  {
    "id": "wave",
    "name": "Wave",
    "category": "special_effects",
    "description": "Horizontal sine wave pattern dithering",
    "complexity": "simple",
    "features": {
      "supportsColorPalettes": true,
      "supportsColorDepth": true,
      "supportsDpiScale": true,
      "supportsLuminanceThreshold": true,
      "isDeterministic": true,
      "requiresMultiPass": false
    },
    "controls": [
      {
        "id": "frequency",
        "label": "Frequency",
        "type": "slider",
        "min": 1,
        "max": 20,
        "step": 1,
        "defaultValue": 5,
        "description": "Wave oscillation frequency",
        "tooltip": "Higher values create more frequent waves",
        "shuffleRange": {
          "min": 3,
          "max": 12
        }
      }
    ]
  }
];

export function findAlgorithm(id) {
  if (!id) return ALGORITHM_REGISTRY[0];
  const exact = ALGORITHM_REGISTRY.find(a => a.id === id);
  if (exact) return exact;
  const norm = id.replace(/_/g, '-');
  const foundNorm = ALGORITHM_REGISTRY.find(a => a.id === norm);
  if (foundNorm) return foundNorm;
  const aliasTarget = ALGORITHM_ALIASES[id] || ALGORITHM_ALIASES[norm];
  if (aliasTarget) {
    return ALGORITHM_REGISTRY.find(a => a.id === aliasTarget) || ALGORITHM_REGISTRY[0];
  }
  return ALGORITHM_REGISTRY[0];
}

// Pre-Dithering Color/Tone Adjustments
export function applyTweaks(data, width, height, settings) {
  const bOffset = (settings.brightness || 0) * 128;
  const cFactor = (settings.contrast || 0) >= 0 ? 1 + (settings.contrast || 0) * 2 : 1 + (settings.contrast || 0) * 0.8;
  const sFactor = 1 + (settings.saturation || 0);
  const invGamma = 1 / Math.max(0.01, settings.gamma || 1.0);

  const len = width * height * 4;
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Contrast & Brightness
    r = (r - 128) * cFactor + 128 + bOffset;
    g = (g - 128) * cFactor + 128 + bOffset;
    b = (b - 128) * cFactor + 128 + bOffset;

    // Saturation
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luma + (r - luma) * sFactor;
    g = luma + (g - luma) * sFactor;
    b = luma + (b - luma) * sFactor;

    // Gamma
    if (invGamma !== 1.0) {
      r = 255 * Math.pow(Math.max(0, Math.min(255, r)) / 255, invGamma);
      g = 255 * Math.pow(Math.max(0, Math.min(255, g)) / 255, invGamma);
      b = 255 * Math.pow(Math.max(0, Math.min(255, b)) / 255, invGamma);
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

// Master Algorithm Dispatcher - Fully applies settings & mutates imageData buffer in place
export function applyDitherAlgorithm(imageData, settings) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const rawId = settings.algorithmId || 'floyd-steinberg';
  const normId = rawId.replace(/_/g, '-');
  const resolvedId = ALGORITHM_ALIASES[rawId] || ALGORITHM_ALIASES[normId] || normId;

  const result = dispatchDither(resolvedId, width, height, data, settings);
  if (result && result.buffer) {
    data.set(new Uint8ClampedArray(result.buffer));
  }
}
