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

  * Text: `bilibili Speed Master`
  * Position: To the right of logo, horizontally aligned
  * Color: White
  * Font weight: Medium to bold

* **Subtitle / Attribution**

  * Text: `Made by cholf5`
  * Position: Directly below title, left-aligned with it
  * Color: Blue (link-like)
  * Font size: ~70% of title
  * Link: https://x.com/cholf5

* **Donate Button**

  * Text: `Donate`
  * Position: Top-right corner
  * Shape: Rounded rectangle
  * Background: Dark with bright multicolor (yellow/green/blue) border glow
  * Text color: White
  * Size: Smaller than main controls, similar height to subtitle line

---

### 2.2 Speed Control Panel

Each row follows the same pattern.

#### Row 1: Current Speed

* **Label**

  * Text: `Current Speed`
  * Position: Left column
  * Color: White
  * Font size: Standard body size

* **Stepper Control**

  * Position: Right column
  * Structure (horizontal):

    1. Minus button (`-`)
    2. Value display (`1`)
    3. Plus button (`+`)
  * Buttons:

    * Shape: Rounded rectangles
    * Background: Slightly lighter dark gray than page background
    * Text color: White
  * Value display:

    * Centered text
    * Same height as buttons

#### Row 2: Default Speed

* **Label**

  * Text: `Default Speed`
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
  * Accent (donate glow): multicolor gradient (yellow/green/blue)

* **Typography**

  * Sans-serif system font
  * Title: Bold, larger size
  * Labels: Regular weight
  * Values: Regular to medium weight

* **Corner Radius**

  * Buttons and inputs: Medium radius (approx. 6–8px)
  * Donate button: Slightly larger radius

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
