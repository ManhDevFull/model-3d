import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ShowroomViewer from './components/ShowroomViewer';

const stats = [
  { value: '2021', label: 'Flagship Year' },
  { value: 'Paint Lab', label: 'Live Preview' },
  { value: 'Maybach', label: 'Showroom Presence' },
];

const features = [
  'Scene 3D is held in a dedicated viewer so the interface never shifts when you change paint.',
  'Single-tone and two-tone finishes stay available with live preview and no camera reset.',
  'The car is centered from its bounding box and the plinth scales to match the actual vehicle footprint.',
];

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

const DUOTONE_PAINT_PRESETS = [
  {
    id: 'obsidian-moonbeam',
    label: 'Obsidian / Moonbeam',
    primary: '#d9d7d2',
    secondary: '#0d0f13',
    note: 'Maybach-style silver lower body with an obsidian upper shell.',
  },
  {
    id: 'graphite-ivory',
    label: 'Graphite / Ivory',
    primary: '#c9c4ba',
    secondary: '#3a3d44',
    note: 'Cool silver lower body with a darker graphite upper deck.',
  },
  {
    id: 'onyx-champagne',
    label: 'Onyx / Champagne',
    primary: '#d7cab7',
    secondary: '#171618',
    note: 'Warm champagne lower body with a formal black upper section.',
  },
  {
    id: 'midnight-porcelain',
    label: 'Midnight / Porcelain',
    primary: '#ece7db',
    secondary: '#161d2a',
    note: 'Porcelain silver lower body with a midnight blue upper cabin.',
  },
];

const DEFAULT_SINGLE_PRESET = SINGLE_PAINT_PRESETS[0];
const DEFAULT_DUOTONE_PRESET = DUOTONE_PAINT_PRESETS[0];
const CUSTOM_PRESET_ID = 'custom';

function App() {
  const [paintMode, setPaintMode] = useState('duotone');
  const [singlePaint, setSinglePaint] = useState({
    presetId: DEFAULT_SINGLE_PRESET.id,
    color: DEFAULT_SINGLE_PRESET.primary,
  });
  const [duotonePaint, setDuotonePaint] = useState({
    presetId: DEFAULT_DUOTONE_PRESET.id,
    lower: DEFAULT_DUOTONE_PRESET.primary,
    upper: DEFAULT_DUOTONE_PRESET.secondary,
  });
  const viewerApiRef = useRef(null);
  const latestPaintSchemeRef = useRef(null);

  const activeSinglePreset = SINGLE_PAINT_PRESETS.find(
    (preset) => preset.id === singlePaint.presetId,
  );
  const activeDuotonePreset = DUOTONE_PAINT_PRESETS.find(
    (preset) => preset.id === duotonePaint.presetId,
  );

  const paintScheme = useMemo(() => {
    if (paintMode === 'single') {
      return {
        mode: 'single',
        primary: singlePaint.color,
        secondary: singlePaint.color,
        label: activeSinglePreset?.label ?? 'Custom Finish',
        note:
          activeSinglePreset?.note ??
          'A custom single-tone finish chosen directly from the paint studio.',
      };
    }

    return {
      mode: 'duotone',
      primary: duotonePaint.lower,
      secondary: duotonePaint.upper,
      label: activeDuotonePreset?.label ?? 'Custom Duotone',
      note:
        activeDuotonePreset?.note ??
        'A custom upper and lower body pairing for a coachbuilt two-tone look.',
    };
  }, [
    activeDuotonePreset,
    activeSinglePreset,
    duotonePaint.lower,
    duotonePaint.upper,
    paintMode,
    singlePaint.color,
  ]);

  latestPaintSchemeRef.current = paintScheme;

  const registerViewerApi = useCallback((viewerApi) => {
    viewerApiRef.current = viewerApi;
    viewerApi?.setPaintScheme(latestPaintSchemeRef.current);
  }, []);

  useEffect(() => {
    viewerApiRef.current?.setPaintScheme(paintScheme);
  }, [paintScheme]);

  const presetList =
    paintMode === 'single' ? SINGLE_PAINT_PRESETS : DUOTONE_PAINT_PRESETS;
  const activePresetId =
    paintMode === 'single' ? singlePaint.presetId : duotonePaint.presetId;

  function applySinglePreset(preset) {
    setPaintMode('single');
    setSinglePaint({
      presetId: preset.id,
      color: preset.primary,
    });
  }

  function applyDuotonePreset(preset) {
    setPaintMode('duotone');
    setDuotonePaint({
      presetId: preset.id,
      lower: preset.primary,
      upper: preset.secondary,
    });
  }

  function updateSingleColor(color) {
    setPaintMode('single');
    setSinglePaint({
      presetId: CUSTOM_PRESET_ID,
      color,
    });
  }

  function updateDuotoneColor(part, color) {
    setPaintMode('duotone');
    setDuotonePaint((current) => ({
      ...current,
      presetId: CUSTOM_PRESET_ID,
      [part]: color,
    }));
  }

  return (
    <main className="page-shell">
      <div className="page-glow page-glow-left" />
      <div className="page-glow page-glow-right" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Private Digital Showroom</p>
          <h1>
            Mercedes-Maybach
            <span>S-Class 2021</span>
          </h1>
          <p className="lead">
            A stable 3D showroom built for close inspection. The viewer keeps a
            fixed cinematic frame while paint changes update only the car
            materials, not the scene.
          </p>

          <div className="stats" aria-label="Showroom overview">
            {stats.map((item) => (
              <article key={item.label} className="stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>

          <div className="feature-panel">
            <p className="feature-label">Showroom Notes</p>
            {features.map((feature) => (
              <p key={feature}>{feature}</p>
            ))}
          </div>

          <PaintConfigurator
            paintMode={paintMode}
            paintScheme={paintScheme}
            presetList={presetList}
            activePresetId={activePresetId}
            singlePaint={singlePaint}
            duotonePaint={duotonePaint}
            onModeChange={setPaintMode}
            onApplySinglePreset={applySinglePreset}
            onApplyDuotonePreset={applyDuotonePreset}
            onUpdateSingleColor={updateSingleColor}
            onUpdateDuotoneColor={updateDuotoneColor}
          />
        </div>

        <section className="showroom-frame" aria-label="3D showroom stage">
          <div className="showroom-frame__label">
            {paintScheme.mode === 'single' ? 'Single Tone' : 'Two-Tone'} /{' '}
            {paintScheme.label}
          </div>
          <ShowroomViewer onReady={registerViewerApi} />
        </section>
      </section>
    </main>
  );
}

function PaintConfigurator({
  paintMode,
  paintScheme,
  presetList,
  activePresetId,
  singlePaint,
  duotonePaint,
  onModeChange,
  onApplySinglePreset,
  onApplyDuotonePreset,
  onUpdateSingleColor,
  onUpdateDuotoneColor,
}) {
  return (
    <section className="configurator-panel">
      <div className="configurator-header">
        <div>
          <p className="feature-label">Paint Studio</p>
          <h2 className="configurator-title">{paintScheme.label}</h2>
        </div>
        <p className="configurator-note">{paintScheme.note}</p>
      </div>

      <div className="mode-toggle" aria-label="Paint mode">
        <button
          type="button"
          className={`mode-toggle__button ${
            paintMode === 'single' ? 'is-active' : ''
          }`}
          aria-pressed={paintMode === 'single'}
          onClick={() => onModeChange('single')}
        >
          Single Tone
        </button>
        <button
          type="button"
          className={`mode-toggle__button ${
            paintMode === 'duotone' ? 'is-active' : ''
          }`}
          aria-pressed={paintMode === 'duotone'}
          onClick={() => onModeChange('duotone')}
        >
          Two-Tone Mix
        </button>
      </div>

      <div
        className={`paint-preview ${
          paintMode === 'duotone' ? 'paint-preview--duotone' : ''
        }`}
        style={{
          '--paint-lower':
            paintMode === 'single' ? singlePaint.color : duotonePaint.lower,
          '--paint-upper':
            paintMode === 'single' ? singlePaint.color : duotonePaint.upper,
        }}
      >
        <div>
          <p className="paint-preview__label">Current Finish</p>
          <strong>{paintScheme.label}</strong>
        </div>
        <span className="paint-preview__codes">
          {paintMode === 'single'
            ? formatHex(singlePaint.color)
            : `${formatHex(duotonePaint.upper)} / ${formatHex(
                duotonePaint.lower,
              )}`}
        </span>
      </div>

      <div className="preset-grid">
        {presetList.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-card ${
              activePresetId === preset.id ? 'is-active' : ''
            }`}
            onClick={() =>
              paintMode === 'single'
                ? onApplySinglePreset(preset)
                : onApplyDuotonePreset(preset)
            }
          >
            <span className="preset-card__swatches">
              <span
                className="preset-card__swatch"
                style={{ backgroundColor: preset.primary }}
              />
              <span
                className="preset-card__swatch"
                style={{
                  backgroundColor:
                    paintMode === 'single' ? preset.primary : preset.secondary,
                }}
              />
            </span>
            <strong>{preset.label}</strong>
            <span>{preset.note}</span>
          </button>
        ))}
      </div>

      <div className="custom-color-grid">
        <label className="color-field">
          <span>{paintMode === 'single' ? 'Body finish' : 'Lower body'}</span>
          <div className="color-field__control">
            <input
              type="color"
              value={
                paintMode === 'single' ? singlePaint.color : duotonePaint.lower
              }
              onChange={(event) =>
                paintMode === 'single'
                  ? onUpdateSingleColor(event.target.value)
                  : onUpdateDuotoneColor('lower', event.target.value)
              }
            />
            <code>
              {formatHex(
                paintMode === 'single'
                  ? singlePaint.color
                  : duotonePaint.lower,
              )}
            </code>
          </div>
        </label>

        {paintMode === 'duotone' ? (
          <label className="color-field">
            <span>Upper body</span>
            <div className="color-field__control">
              <input
                type="color"
                value={duotonePaint.upper}
                onChange={(event) =>
                  onUpdateDuotoneColor('upper', event.target.value)
                }
              />
              <code>{formatHex(duotonePaint.upper)}</code>
            </div>
          </label>
        ) : null}
      </div>
    </section>
  );
}

function formatHex(value) {
  return value.toUpperCase();
}

export default App;
