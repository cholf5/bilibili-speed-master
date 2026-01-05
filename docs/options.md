Below is a precise, structured reverse-engineering of the second UI.

---

## 1. PAGE

* **Type**: Full-page dashboard (browser extension management page)
* **Layout**: Vertical flow, fixed-width centered content
* **Background**: Uniform dark gray
* **Primary purpose**:

  * Display cumulative time savings
  * Configure default playback behavior
  * Manage per-channel playback speed overrides

---

## 2. SECTIONS (top → bottom)

1. **Top Navigation / Branding Bar**
2. **Summary Cards Row**
3. **Channel Configuration Table**

---

## 3. COMPONENTS (by section)

---

### 3.1 Top Navigation / Branding Bar

**Layout**

* Single horizontal bar
* Content aligned left and right
* Height: ~1.2× summary card title height

**Left group**

* **Logo**

  * Circular icon
  * White segmented ring + blue triangular play symbol
  * Vertically centered

* **Title block**

  * Title text: `bilibili Speed Master`

    * Color: White
    * Font weight: Bold
  * Subtitle text: `Made by cholf5`

    * Color: Blue
    * Font size: ~65% of title
  * Vertical stacking
  * Left-aligned

**Right group**

* **Rating prompt**

  * Text: `Rate me:`
  * Color: White
* **Star rating**

  * 5 filled stars
  * Color: Yellow
  * Inline, horizontally aligned with text
* **Donate button**

  * Text: `Donate`
  * Rounded rectangle
  * Dark background
  * Bright multicolor glow border
  * White text
  * Slightly taller than star icons

---

### 3.2 Summary Cards Row

**Layout**

* Three cards in a single row
* Equal width
* Uniform height
* Even horizontal spacing
* Cards have rounded corners and elevated contrast vs background

---

#### Card 1: Total Time Saved

* **Title**

  * Text: `Total Time Saved`
  * Color: White
  * Smaller font size

* **Value**

  * Text: `413.963 hours`
  * Color: Light blue
  * Font size: ~1.6× title
  * Font weight: Medium–bold

* **Alignment**

  * Vertically centered content
  * Left-aligned text

---

#### Card 2: Default Speed

* **Title**

  * Text: `Default Speed`
  * Color: White

* **Stepper Control**

  * Horizontal layout
  * Buttons: `-` and `+`
  * Value: `1.5`
  * Buttons:

    * Rounded rectangles
    * Dark gray background
    * White symbols
  * Value box:

    * Same height as buttons
    * Centered numeric text

---

#### Card 3: Preferred Quality

* **Title**

  * Text: `Preferred Quality`
  * Color: White

* **Dropdown**

  * Value: `Auto`
  * Text color: Blue
  * Background: Dark gray
  * Right-aligned caret icon
  * Rounded rectangle
  * Width ≈ stepper control width

---

### 3.3 Channel Configuration Table

**Container**

* Full-width card
* Rounded corners
* Dark gray background
* Internal padding on all sides

---

#### Table Header Row

* **Columns**

  1. `Channel`
  2. `Last Visit`
  3. `Speed`

* **Styling**

  * Header text: White
  * Divider line below header
  * Column alignment:

    * Channel: Left
    * Last Visit: Center/right
    * Speed: Right

---

#### Table Rows (Repeated)

Each row has uniform height.

**Column 1: Channel**

* Circular avatar image (left)
* Channel name text (right of avatar)

  * Color: Light blue
  * Single-line
* Horizontal alignment

**Column 2: Last Visit**

* Timestamp format: `YYYY-MM-DD HH:MM:SS`
* Color: Light gray
* Right-aligned within column

**Column 3: Speed Controls**

* Horizontal control group:

  1. `-` button
  2. Speed value (e.g. `1.0`, `1.5`)
  3. `+` button
  4. Delete button (`X`)
* Buttons:

  * Rounded rectangles
  * Dark background
  * White icons
* Delete button:

  * Square-ish
  * `X` icon
  * Same height as stepper buttons

---

## 4. VISUAL STYLE TOKENS

### Colors

* Page background: ~#1e1f22
* Card background: ~#2b2d31
* Table background: ~#2b2d31
* Primary text: #ffffff
* Secondary text: #b0b0b0
* Accent blue: #4da3ff
* Accent yellow (stars): #f5c518
* Donate glow: multicolor gradient (cyan / green / yellow)

### Typography

* Sans-serif system font
* Titles: Bold
* Labels: Regular
* Values: Medium–bold
* Numeric values monospaced appearance (consistent width)

### Shapes

* Border radius:

  * Cards: Medium (~12px)
  * Buttons/inputs: Small–medium (~6–8px)
* No visible drop shadows; contrast achieved via color difference

---

## 5. SPACING & ALIGNMENT RULES

* **Page padding**

  * Uniform horizontal margins
  * Content centered in viewport

* **Vertical spacing**

  * Header → cards: ~24px
  * Cards → table: ~24–32px
  * Table rows: consistent row height

* **Horizontal spacing**

  * Card gaps: equal spacing
  * Avatar → text: small fixed gap
  * Buttons within stepper: tight grouping with equal gaps

* **Alignment**

  * Cards aligned to same baseline
  * Numeric controls vertically centered
  * Table columns aligned consistently across all rows

* **Consistency**

  * All buttons share height
  * All rounded corners follow the same radius scale
  * Repeated interaction patterns (steppers) are visually identical across contexts


