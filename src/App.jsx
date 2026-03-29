import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DEFAULT_MODEL_ID, MODEL_LIBRARY } from './data/modelCatalog';
import ShowroomViewer from './components/ShowroomViewer';

const SINGLE_PAINT_PRESETS = [
  {
    id: 'bronze-dusk',
    label: 'Bronze Dusk',
    primary: '#6d4935',
    note: 'Warm metallic bronze with soft brown undertones.',
  },
  {
    id: 'obsidian-noir',
    label: 'Obsidian Noir',
    primary: '#151315',
    note: 'Deep piano black for a formal limousine profile.',
  },
  {
    id: 'champagne-mist',
    label: 'Champagne Mist',
    primary: '#b9a488',
    note: 'Muted champagne finish with a classic chauffeur feel.',
  },
  {
    id: 'emerald-reserve',
    label: 'Emerald Reserve',
    primary: '#21372d',
    note: 'Dark green luxury paint with understated presence.',
  },
];

const DEFAULT_SINGLE_PRESET = SINGLE_PAINT_PRESETS[0];

function App() {
  const [activeModelId, setActiveModelId] = useState(DEFAULT_MODEL_ID);
  const [singlePaint, setSinglePaint] = useState({
    presetId: DEFAULT_SINGLE_PRESET.id,
    color: DEFAULT_SINGLE_PRESET.primary,
  });
  const [customSwatches, setCustomSwatches] = useState([]);
  const viewerApiRef = useRef(null);
  const latestPaintSchemeRef = useRef(null);

  const activeModel = useMemo(
    () =>
      MODEL_LIBRARY.find((model) => model.id === activeModelId) ??
      MODEL_LIBRARY[0],
    [activeModelId],
  );

  const allSwatches = useMemo(() => {
    const presetColors = new Set(
      SINGLE_PAINT_PRESETS.map((preset) => preset.primary.toUpperCase()),
    );
    const customEntries = customSwatches
      .filter((color) => !presetColors.has(color.toUpperCase()))
      .map((color) => ({
        id: `custom-${color.slice(1).toLowerCase()}`,
        label: 'Custom Tone',
        primary: color,
        note: 'A custom paint tone saved to the live preview rail.',
      }));

    return [...SINGLE_PAINT_PRESETS, ...customEntries];
  }, [customSwatches]);

  const activeSinglePreset = useMemo(
    () =>
      allSwatches.find((preset) => preset.id === singlePaint.presetId) ??
      allSwatches.find(
        (preset) =>
          preset.primary.toUpperCase() === singlePaint.color.toUpperCase(),
      ),
    [allSwatches, singlePaint.color, singlePaint.presetId],
  );

  const paintScheme = useMemo(
    () => ({
      mode: 'single',
      primary: singlePaint.color,
      secondary: singlePaint.color,
      label: activeSinglePreset?.label ?? 'Custom Finish',
      note:
        activeSinglePreset?.note ??
        'A custom single-tone finish chosen directly from the paint dock.',
    }),
    [activeSinglePreset, singlePaint.color],
  );

  latestPaintSchemeRef.current = paintScheme;

  const registerViewerApi = useCallback((viewerApi) => {
    viewerApiRef.current = viewerApi;
    viewerApi?.setPaintScheme(latestPaintSchemeRef.current);
  }, []);

  useEffect(() => {
    viewerApiRef.current?.setPaintScheme(paintScheme);
  }, [paintScheme]);

  function applySinglePreset(preset) {
    setSinglePaint({
      presetId: preset.id,
      color: preset.primary,
    });
  }

  function applyCustomColor(color) {
    const normalizedColor = color.toUpperCase();
    const matchingPreset = SINGLE_PAINT_PRESETS.find(
      (preset) => preset.primary.toUpperCase() === normalizedColor,
    );

    setCustomSwatches((current) => {
      if (current.some((swatch) => swatch.toUpperCase() === normalizedColor)) {
        return current;
      }

      return [...current.slice(-4), normalizedColor];
    });

    setSinglePaint({
      presetId:
        matchingPreset?.id ?? `custom-${normalizedColor.slice(1).toLowerCase()}`,
      color: normalizedColor,
    });
  }

  function selectModel(nextModelId) {
    startTransition(() => {
      setActiveModelId(nextModelId);
    });
  }

  return (
    <main className="page-shell">
      <section className="showroom-stage" aria-label="3D showroom stage">
        <ShowroomViewer activeModel={activeModel} onReady={registerViewerApi} />

        <div className="stage-vignette stage-vignette-top" />
        <div className="stage-vignette stage-vignette-bottom" />

        <div className="stage-overlay stage-overlay-copy">
          <div key={activeModel.id} className="stage-copy">
            <p className="stage-copy__eyebrow">
              {activeModel.badge} / Material Preview
            </p>
            <h1>
              {activeModel.brand}
              <span>{activeModel.title}</span>
            </h1>
            <p className="stage-copy__descriptor">{activeModel.descriptor}</p>
            <p className="stage-copy__headline">{activeModel.headline}</p>

            <div className="stage-copy__stats" aria-label="Model overview">
              {activeModel.stats.map((item) => (
                <div key={item.label} className="stage-copy__stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="stage-copy__notes">
              {activeModel.highlights.slice(0, 2).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="stage-overlay stage-overlay-paint">
          <ColorDock
            swatches={allSwatches}
            activeSwatchId={activeSinglePreset?.id ?? singlePaint.presetId}
            activeColor={singlePaint.color}
            onSelectSwatch={applySinglePreset}
            onAddCustomColor={applyCustomColor}
          />
        </div>

        <div className="stage-overlay stage-overlay-models">
          <ModelRail
            models={MODEL_LIBRARY}
            activeModelId={activeModel.id}
            onSelectModel={selectModel}
          />
        </div>
      </section>
    </main>
  );
}

function ColorDock({
  swatches,
  activeSwatchId,
  activeColor,
  onSelectSwatch,
  onAddCustomColor,
}) {
  return (
    <section className="color-dock" aria-label="Paint color selection">
      <p className="color-dock__label">Paint</p>
      <div className="color-dock__rail">
        {swatches.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            className={`color-dock__swatch ${
              activeSwatchId === swatch.id ? 'is-active' : ''
            }`}
            style={{ '--swatch-color': swatch.primary }}
            onClick={() => onSelectSwatch(swatch)}
            aria-label={swatch.label}
            title={swatch.label}
          />
        ))}

        <label
          className="color-dock__swatch color-dock__swatch-add"
          aria-label="Add custom color"
          title="Add custom color"
        >
          <input
            type="color"
            value={activeColor}
            onChange={(event) => onAddCustomColor(event.target.value)}
          />
          <span>+</span>
        </label>
      </div>
    </section>
  );
}

function ModelRail({ models, activeModelId, onSelectModel }) {
  const railRef = useRef(null);

  function scrollRail(direction) {
    railRef.current?.scrollBy({
      left: direction * 300,
      behavior: 'smooth',
    });
  }

  return (
    <section className="model-rail" aria-label="Model selection">
      <button
        type="button"
        className="model-rail__nav"
        onClick={() => scrollRail(-1)}
        aria-label="Scroll model list left"
      >
        <span />
      </button>

      <div className="model-rail__viewport">
        <div ref={railRef} className="model-rail__track">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              className={`model-rail__card ${
                activeModelId === model.id ? 'is-active' : ''
              }`}
              onClick={() => onSelectModel(model.id)}
            >
              <span className="model-rail__badge">{model.badge}</span>
              <strong>{model.cardTitle}</strong>
              <span>{model.descriptor}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="model-rail__nav model-rail__nav-next"
        onClick={() => scrollRail(1)}
        aria-label="Scroll model list right"
      >
        <span />
      </button>
    </section>
  );
}

export default App;
