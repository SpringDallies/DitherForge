// User-friendly plain English descriptions for all 63 DitherForge algorithms.
// Tone: Plain English, no jargon.
// 'what': describes the visual effect (<= 12 words).
// 'why': describes a use case (<= 12 words).

export interface UserAlgorithmDescription {
  what: string;
  why: string;
}

export const USER_ALGORITHM_DESCRIPTIONS: Record<string, UserAlgorithmDescription> = {
  // --- Error Diffusion (15) ---
  floyd_steinberg: {
    what: "Smooth, natural-looking grain that spreads shades of grey evenly across images.",
    why: "Great default for photos and portraits. Gives clean gradients and soft edges."
  },
  atkinson: {
    what: "High-contrast dithering with lots of pure white and pure black areas.",
    why: "Best for stylized illustrations, comics, or crisp minimalist graphics."
  },
  jarvis_judice_ninke: {
    what: "Fine, delicate grain that blends subtle tones with minimal visible patterns.",
    why: "Detailed landscape photographs with gentle skies and soft shadows."
  },
  stucki: {
    what: "Crisp stippled dots that preserve sharp edges and fine outlines.",
    why: "Technical diagrams, line art, and high-detail architectural drawings."
  },
  burkes: {
    what: "Fast horizontal dot spread that avoids vertical streaks and clumps.",
    why: "Real-time rendering of wide images and retro action scenes."
  },
  sierra_3: {
    what: "Soft, balanced dot scattering that creates gentle transitions in shadows.",
    why: "Moody portraits and low-light scenes with dark tone gradations."
  },
  sierra_2: {
    what: "Clean medium grain with good detail retention and snappy rendering.",
    why: "Everyday photos and web graphics needing clear, balanced shading."
  },
  sierra_lite: {
    what: "Chunky, gritty retro dots with a fast and punchy texture.",
    why: "Low-resolution pixel art sprites and classic 8-bit game textures."
  },
  stevenson_arce: {
    what: "Hexagonal dot arrangement that eliminates harsh grid lines and streaks.",
    why: "Smooth skin tones and natural organic textures without banding."
  },
  fan: {
    what: "Adaptive dot scattering that prevents worm-like trails in bright areas.",
    why: "Highlights, clouds, and bright sunny skies that need clean tones."
  },
  shiau_fan: {
    what: "Even speckling designed to keep light tones smooth and consistent.",
    why: "Pastel artwork and subtle gradients with delicate pale colors."
  },
  shiau_fan_2: {
    what: "Tight, compact dot pattern that renders quickly on simple graphics.",
    why: "Fast processing for banners, thumbnails, and compact retro illustrations."
  },
  false_floyd_steinberg: {
    what: "Mechanical cross-hatch shading with distinct geometric dot clusters.",
    why: "Vintage computer aesthetics and stylized retro user interface graphics."
  },
  minimized_avg_error: {
    what: "Carefully balanced speckles that preserve subtle shifts in tonal gradients.",
    why: "Fine art reproductions and gentle watercolor paintings."
  },
  dynamic_serpentine: {
    what: "Zigzag scanning dots that eliminate directional bias and slanted streaks.",
    why: "Symmetrical compositions and geometric artwork requiring neutral flow."
  },

  // --- Ordered Dithering (5) ---
  bayer_2x2: {
    what: "Bold, chunky crosshatch pattern visible from far away.",
    why: "Tiny icons, low-resolution sprites, and early arcade game graphics."
  },
  bayer_4x4: {
    what: "Classic checkerboard mesh mimicking early PC and Macintosh displays.",
    why: "Authentic 1980s CGA, EGA, and vintage computer artwork."
  },
  bayer_8x8: {
    what: "Medium geometric crosshatching with smooth tone steps across shading.",
    why: "Classic desktop publishing, newspaper styling, and retro poster art."
  },
  bayer_16x16: {
    what: "Fine, dense ordered pattern providing gradual tones without color banding.",
    why: "High-resolution images that need retro ordered styling without obvious grain."
  },
  clustered_dot: {
    what: "Circular dot clusters resembling traditional newsprint halftone screen printing.",
    why: "Comic books, vintage print magazines, and pop-art poster designs."
  },

  // --- Pattern Dithers (8) ---
  checkered: {
    what: "Rigid micro-checkerboard grid that grows denser in dark areas.",
    why: "Architectural graphics, textile patterns, and stylized geometric posters."
  },
  horizontal_lines: {
    what: "Horizontal stripes of varying thickness that form the entire picture.",
    why: "CRT monitor scanline effects and retro video terminal art."
  },
  vertical_lines: {
    what: "Vertical pinstripe bars whose widths reflect lightness and shadow.",
    why: "Barcode aesthetics, lenticular card illusions, and optical poster designs."
  },
  crosshatch: {
    what: "Crisp intersecting ink lines simulating pen drawings and historic etchings.",
    why: "Technical sketches, engraving art, and book illustrations."
  },
  diagonal_hatch: {
    what: "Dynamic 45-degree angled ink strokes creating depth through diagonal lines.",
    why: "Manga backgrounds, comic shading, and conceptual design blueprints."
  },
  concentric_diamond: {
    what: "Radiating diamond shapes repeating across the canvas in neat tiles.",
    why: "Geometric backgrounds, album covers, and ornamental art deco motifs."
  },
  woven_basket: {
    what: "Overlapping horizontal and vertical blocks mimicking woven fabric cloth.",
    why: "Textile mockup art, carbon fiber looks, and craft branding."
  },
  hex_stipple: {
    what: "Honeycomb grid of dots spaced at neat sixty-degree intervals.",
    why: "Modern geometric illustrations and clean vector halftone styling."
  },

  // --- Glitch Effects (17) ---
  scanline_jitter: {
    what: "Horizontal scanlines that wobble irregularly across the screen frame.",
    why: "Worn analog monitors, surveillance camera feeds, and sci-fi terminals."
  },
  chromatic_offset: {
    what: "Red, green, and blue color channels shifted apart horizontally.",
    why: "3D anaglyph glasses effects and energetic cyberpunk visuals."
  },
  pixel_sorting: {
    what: "Streaks of pixels melted downward based on their brightness level.",
    why: "Dreamy glitch art, album covers, and surreal melting portraits."
  },
  digital_artifacts: {
    what: "Blocky compression squares resembling damaged video streams or low-bitrate downloads.",
    why: "Webcore aesthetics, corrupted video files, and cyber dystopian scenes."
  },
  interlacing_tear: {
    what: "Alternating horizontal scanline slices displaced by simulated high-speed movement.",
    why: "Action-packed broadcast TV rips and sports video rewind effects."
  },
  crt_bloom: {
    what: "Luminescent glowing halo radiating from brightest highlights into neighboring shadows.",
    why: "Arcade cabinet glow, neon signs, and phosphor tube displays."
  },
  bit_crush: {
    what: "Harsh posterized color bands created by drastically reducing color resolution.",
    why: "Lo-fi synthwave art, deep-fried memes, and crunchy digital retro."
  },
  vhs_tracking: {
    what: "Static bars and color distortion from misaligned magnetic video tape.",
    why: "1980s home video footage, analog horror, and skate videos."
  },
  bad_ram: {
    what: "Scattered inverted pixels mimicking faulty video memory chips and crashes.",
    why: "Broken console emulation, corrupt save files, and hacker interfaces."
  },
  wave_distortion: {
    what: "Smooth sinusoidal ripples undulating across the image horizontally and vertically.",
    why: "Underwater reflections, heat haze illusions, and psychedelic dream sequences."
  },
  quant_slice: {
    what: "Stepped topographic bands that carve tone levels into flat plateaus.",
    why: "Elevation map styling, graphic decals, and stark poster art."
  },
  matrix_rake: {
    what: "Diagonal threshold waves sweeping across pixels like a fine comb.",
    why: "Kinetic motion graphics and futuristic radar display styling."
  },
  static_snow: {
    what: "Dense burst of black and white broadcast radio frequency noise.",
    why: "Untuned television channels, late-night broadcasts, and haunted video artifacts."
  },
  sync_pulse_loss: {
    what: "Rolling vertical frame tear caused by failing television hold circuits.",
    why: "Channel flipping simulations and unstable analog security monitors."
  },
  feedback_ringing: {
    what: "Echoing ghost outlines repeating outward from sharp high-contrast edges.",
    why: "Recursive video loops, haunted portraits, and psychedelic music videos."
  },
  chroma_subsample: {
    what: "Coarse color blocks underneath sharp black and white brightness details.",
    why: "Early composite video, webcams, and digital camcorder aesthetics."
  },
  moire_glitch: {
    what: "Hypnotic interference ripples created by colliding high-frequency optical patterns.",
    why: "Optical illusions, geometric glitch art, and kinetic poster designs."
  },

  // --- Special Effects (16) ---
  fixed_threshold: {
    what: "Pure stark silhouette dividing pixels strictly into black or white.",
    why: "Stencil art, screen printing masks, and stamp graphics."
  },
  random_threshold: {
    what: "Uniform TV-snow noise comparison eliminating all structured grid patterns.",
    why: "Gritty underground zines, punk flyers, and raw photocopier aesthetics."
  },
  blue_noise: {
    what: "Pleasing organic grain with evenly dispersed dots and zero clumping.",
    why: "Photographs, artwork, and natural textures needing film-like smoothness."
  },
  gaussian_noise: {
    what: "Natural film grain with bell-curve noise clustering in midtone regions.",
    why: "High-ISO camera photography, cinema stills, and documentary portraits."
  },
  perlin_gradient: {
    what: "Smoky marbled cloud patterns weaving procedurally through image tones.",
    why: "Organic textures, atmospheric mist, and abstract fantasy landscape art."
  },
  riemersma: {
    what: "Curving space-filling fractal paths with gentle memory decay along curves.",
    why: "Intricate curved contours, biological shapes, and swirling liquid forms."
  },
  ostromoukhov: {
    what: "Smart adaptive diffusion adjusting dot spacing to local brightness values.",
    why: "Studio portraits, high-end fine art prints, and smooth skin tones."
  },
  tpdf_noise: {
    what: "Triangular noise probability distribution eliminating repetitive harmonic grain shapes.",
    why: "Clean audio-visual crossovers, scientific plots, and minimal graphic art."
  },
  companding_curve: {
    what: "Logarithmic tone compression pulling hidden textures out of dark shadows.",
    why: "Nighttime photography, deep shadow recovery, and high dynamic range scenes."
  },
  spatial_lattice: {
    what: "Honeycomb coordinate diffusion producing equilateral triangular dot clusters across tones.",
    why: "Scientific illustrations, modern vector art, and architectural tile patterns."
  },
  sobel_feature: {
    what: "Intelligent edge-detection damping dither noise along crisp silhouette outlines.",
    why: "Logos, typography, product photos, and vector-raster hybrid art."
  },
  laplacian_mod: {
    what: "Second-derivative edge sharpening built directly into the dot quantization process.",
    why: "High-frequency textures like foliage, fabric weaves, and stone surfaces."
  },
  directional_gradient: {
    what: "Dither hatching strokes aligned along local optical gradient angle vectors.",
    why: "Woodcut prints, classical etching style, and contour-following shading."
  },
  voronoi_cellular: {
    what: "Cellular bubble stippling with natural dot relaxation across tone zones.",
    why: "Pencil stipple art, hand-drawn ink shading, and stone mosaics."
  },
  diffusion_blur: {
    what: "Unsharp masking combined with spatial error dispersal for punchy clarity.",
    why: "Low-contrast photos, foggy landscapes, and soft focus digital captures."
  },
  quantum_stipple: {
    what: "Simulated photon arrival clouds yielding organic probabilistic dot scatterings.",
    why: "Astrophotography, deep-space imagery, and delicate museum art archival."
  },

  // --- Bespoke & Temporal (2) ---
  ignition_glow: {
    what: "Original luminous bloom analyzing dot density to produce glowing highlights.",
    why: "Neon signage, molten metal, sci-fi lasers, and synthwave scenes."
  },
  temporal_kinetic: {
    what: "Continuous phase-shifted dithering that stays alive when viewing animation.",
    why: "Animated GIFs, retro video loops, and dynamic motion graphics."
  }
};
