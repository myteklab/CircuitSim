# CircuitSim

An interactive educational circuit simulator for designing, building, and testing electrical circuits in real time. Visual feedback on current flow, Ohm's Law calculations, and component damage when safety limits are exceeded.

![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

## Features

### Components

**Basic Electronics**
- **Battery** — voltage source (3V, 6V, 9V)
- **Resistor** — current limiter (12 standard E12 values: 10 to 100K)
- **LED** — light indicator (red, green, blue, yellow, white)
- **Diode** — one-way current valve
- **Switch** — manual circuit toggle
- **Ground** — circuit reference point

**Robotics**
- **4xAA Battery Pack** — robot power source
- **Raspberry Pi** — microcontroller with GPIO pins and signal outputs
- **Motor Controller** — drives DC motors with VCC, GND, and input signals
- **DC Motor** — spinning motor driven by controller

### Simulation

- Real-time Ohm's Law calculations (voltage, current, resistance, power)
- Animated current flow dots on wires
- Component damage detection with visual effects:
  - LEDs burn out above 30mA
  - Diodes burn out above current limit
  - Resistors burn out above 0.5W power dissipation
  - Explosion, spark, and smoke animations on damage
- Short circuit detection and warnings
- Multiple circuit path analysis
- Temperature visualization (resistors glow when hot)
- GPIO-driven LED circuits with Raspberry Pi
- Robot wiring validation with progress checklist

### Editor

- Drag-and-drop component placement from sidebar palette
- Click terminals to draw wires with multi-point routing
- Component rotation (8 orientations)
- Double-click components to cycle through options
- Properties panel for real-time value editing
- Grid snap (toggleable)
- Undo/redo (50-state history)
- Auto-save every 60 seconds

### Educational Panels

- **Circuit Insights** — tips and analysis based on the current circuit
- **Ohm's Law Panel** — live calculations with color-coded values
- **Robot Wiring Panel** — connection checklist for robotics projects

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save circuit |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Delete` / `Backspace` | Remove selected component |
| `R` | Rotate selected component |
| `G` | Toggle grid snap |
| `Space` | Start/stop simulation |
| `Escape` | Cancel wire drawing |
| `Space + Drag` | Pan canvas |
| `+` / `-` | Zoom in/out |
| `0` | Reset zoom and pan |

## Getting Started

1. Open `index.html` in a modern browser.
2. Drag a component from the left palette onto the canvas.
3. Click a terminal (yellow dot) to start drawing a wire, then click another terminal to connect.
4. Add a battery, some components, and a ground to complete a circuit.
5. Click **Start** to run the simulation and see current flow.

## Dependencies

None — built entirely with vanilla JavaScript and HTML5 Canvas.

## Project Structure

```
├── index.html              # Application entry point (HTML + embedded CSS)
├── js/
│   ├── main.js                     # Initialization and lifecycle
│   ├── Component.js                # Base class for all components
│   ├── CircuitCanvas.js            # Canvas rendering and interaction
│   ├── CircuitSimulator.js         # Ohm's Law engine and path analysis
│   ├── UIManager.js                # Button handlers and status messages
│   ├── SaveLoadManager.js          # Persistence and auto-save
│   ├── HistoryManager.js           # Undo/redo
│   ├── PathFinder.js               # Circuit path analysis
│   ├── VisualEffects.js            # Explosions, sparks, smoke
│   ├── RobotWiringValidator.js     # Robotics connection validation
│   └── components/
│       ├── Battery.js
│       ├── Resistor.js
│       ├── LED.js
│       ├── Diode.js
│       ├── Switch.js
│       ├── Wire.js
│       ├── Ground.js
│       ├── BatteryPackAA.js
│       ├── RaspberryPi.js
│       ├── MotorController.js
│       └── DCMotor.js
└── LICENSE                 # GPL-3.0
```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
