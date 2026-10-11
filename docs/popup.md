Below is a structured UI reverse-engineering description based on the provided screenshot.

---

## 1. PAGE

* **Type**: Browser extension popup / compact settings panel
* **Aspect ratio**: Portrait-oriented rectangle, approx. 1:1.1
* **Background**: Solid dark gray / near-black
* **Primary function**: Control YouTube playback speed and quality, show cumulative time saved

---

## 2. SECTIONS (top → bottom)

1. **Header / Branding**
2. **Speed Control Panel**
3. **Quality Preference Panel**
4. **Statistics Display**
5. **Rating Display**
6. **Footer Action**

---

## 3. COMPONENTS (by section)

### 2.1 Header / Branding

* **Logo**

  * Position: Top-left
  * Shape: Circular icon
  * Content: White ring with segmented ticks; blue triangular “play” symbol inside
  * Size: Approx. 1.2× text height of title

* **Title**

  * Text: `Bilibili Speed Master`
  * Position: To the right of logo, horizontally aligned
  * Color: White
  * Font weight: Medium to bold

* **Subtitle / Attribution**

  * Text: `Made by cholf5`
  * Position: Directly below title, left-aligned with it
  * Color: Blue (link-like)
  * Font size: ~70% of title
  * Link: https://x.com/cholf5

---

### 2.2 Current Channel Card (contextual)

* **Visibility**: Rendered only when the active tab is a Bilibili video page and the
  current channel is known; hidden otherwise, so it never competes with Global Speed.
* **Look**: Distinct sub-card with a blue-tinted background and border, separated from
  the settings panel below.
* **Label**: `This channel` (small, blue, uppercase)
* **Row content**:
  * Left: circular channel avatar (fallback: first character of the channel name) and a
    two-line text block — the channel name (truncated with ellipsis) plus a small gray
    meta line stating where the channel's effective speed comes from:
    `Override · 1.5x` when the channel has a stored override, or `Following global · 1.0x`
    when it inherits the global default. The meta line refreshes live via storage changes
  * Follow-global action (D-10): while a stored override exists, a small pill
    button labeled `Follow global` sits at the end of the meta line; clicking
    it deletes the channel override (single-writer config path) and the
    channel immediately returns to the global speed. Not rendered when the
    channel has no override
  * Right: stepper control (`-` / current video speed / `+`) that adjusts the speed of
    the video currently playing in that tab; the change is persisted as the channel
    override through the same user-intent path as the in-video widget

### 2.2.1 Speed Control Panel (global settings)

#### Row: Global Speed

* **Label**

  * Text: `Global Speed`
  * Same styling and alignment as Row 1 label

* **Stepper Control**

  * Value: `1.5`
  * Same structure, size, and style as Row 1 stepper

---

### 2.3 Quality Preference Panel

* **Label**

  * Text: `Preferred Quality`
  * Position: Left column
  * Color: White

* **Dropdown Selector**

  * Position: Right column
  * Value shown: `Auto`
  * Shape: Wide rounded rectangle
  * Background: Dark gray
  * Text color: Blue
  * Dropdown arrow: Right side, downward caret
  * Width: Slightly wider than stepper controls

---

### 2.4 Statistics Display

* **Text**

  * Content: `Total time saved: 413.963 hours`
  * Position: Centered horizontally
  * Color:

    * Label text: White
    * Numeric value: Light blue
  * Font size: Slightly larger than body text
  * Weight: Medium

---

### 2.5 Rating Display

* **Star Rating**

  * Count: 5 stars
  * State: All filled
  * Color: Yellow
  * Position: Centered horizontally
  * Size: Each star approx. height of body text
  * Spacing: Small, even gaps between stars

---

### 2.6 Footer Action

* **More Options Button**

  * Text: `More Options`
  * Icon: Gear icon on the left of text
  * Position: Centered horizontally
  * Shape: Rounded rectangle
  * Background: Dark gray
  * Border: Thin, subtle outline
  * Text color: White
  * Icon color: Light gray
  * Size: Wider than stepper buttons, shorter than dropdown

---

## 4. VISUAL STYLE TOKENS

* **Color Palette**

  * Background: #1f1f1f (approx.)
  * Panel elements: #2a2a2a to #333333
  * Primary text: #ffffff
  * Secondary text / links: #3ea6ff (blue)
  * Accent (rating): #f5c518 (yellow)

* **Typography**

  * Sans-serif system font
  * Title: Bold, larger size
  * Labels: Regular weight
  * Values: Regular to medium weight

* **Corner Radius**

  * Buttons and inputs: Medium radius (approx. 6–8px)

* **Icons**

  * Flat, no shadows
  * Single-color glyphs

---

## 5. SPACING & ALIGNMENT RULES

* **Overall Padding**

  * Uniform padding on all sides (approx. 16–20px)

* **Grid**

  * Two-column layout for settings rows:

    * Left: labels (fixed width)
    * Right: controls (flex width)
  * Header uses horizontal alignment with logo + text block

* **Vertical Spacing**

  * Between rows: ~12–16px
  * Between major sections: ~20–24px

* **Alignment**

  * Labels left-aligned
  * Controls right-aligned within their column
  * Stats, rating, and footer button center-aligned

* **Consistency**

  * All interactive controls share equal height
  * Button text vertically centered
  * Numeric values centered both horizontally and vertically
