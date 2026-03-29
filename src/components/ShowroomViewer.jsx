import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
  useGLTF,
} from '@react-three/drei';
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  MathUtils,
  Vector3,
} from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { MODEL_LIBRARY } from '../data/modelCatalog';

const DEFAULT_SCHEME = {
  mode: 'single',
  primary: '#6d4935',
  secondary: '#6d4935',
};

const STAGE_ROTATION = -0.58;
const STAGE_FORWARD_AXIS = new Vector3(
  Math.sin(STAGE_ROTATION),
  0,
  Math.cos(STAGE_ROTATION),
).normalize();
const CAMERA_POSITION = [3, 2, 5];
const CAMERA_FOV = 23;
const CONTROL_TARGET = [0, 1, 0];
const MODEL_TARGET_LENGTH = 5.85;
const ROAD_SCROLL_SPEED = 0.92;
const ROAD_MARKER_GAP = 2.1;
const ROAD_MARKER_LENGTH = 1.4;
const RIGHT_PROP_GAP = 2.25;
const ROAD_VISIBLE_DEPTH_MULTIPLIER = 22;
const BODY_SWAY_SPEED = 0.9;
const BODY_SWAY_AMOUNT = 0.005;
const WHEEL_SPIN_FACTOR = 0.4;
const WHEEL_TOKENS = ['wheel', 'rim', 'tire', 'tyre', 'koleso', '3dwheel'];
const WHEEL_POSITION_TOKENS = ['front', 'rear', 'left', 'right', 'l', 'r'];
const WHEEL_BLOCKED_TOKENS = [
  'calliper',
  'caliper',
  'brake',
  'interior',
  'window',
  'glass',
  'plate',
  'steering',
  'light',
  'badge',
  'mirror',
  'trim',
];
const DEFAULT_PAINT_PROFILE = {
  topStart: 0.48,
  topEnd: 0.64,
  hoodStart: 0.36,
  hoodEnd: 0.08,
  hoodHeightStart: 0.22,
  hoodHeightEnd: 0.4,
};
const DEFAULT_LAYOUT = {
  platformWidth: 2.6,
  platformDepth: 5.8,
  platformHeight: 0.34,
  roadShiftX: -0.7,
  shadowScale: 6.1,
  shadowY: -0.02,
  paintMask: {
    topStart: 0.8,
    topEnd: 1.1,
    hoodStart: 0.8,
    hoodEnd: 1.7,
    hoodHeightStart: 0.2,
    hoodHeightEnd: 0.5,
  },
};

const trimColor = new Color('#1a1512');
const chromeWarmth = new Color('#d9b77d');
const paintBase = new Color('#ffffff');

const ShowroomViewer = memo(function ShowroomViewer({ activeModel, onReady }) {
  const stageApiRef = useRef(null);
  const queuedSchemeRef = useRef(DEFAULT_SCHEME);
  const appliedSchemeRef = useRef(null);
  const viewerApiRef = useRef({
    setPaintScheme(nextScheme) {
      queuedSchemeRef.current = cloneScheme(nextScheme);
      if (appliedSchemeRef.current && areSchemesEqual(appliedSchemeRef.current, nextScheme)) {
        return;
      }
      appliedSchemeRef.current = cloneScheme(nextScheme);
      stageApiRef.current?.applyPaintScheme(nextScheme);
    },
  });

  useEffect(() => {
    onReady?.(viewerApiRef.current);
    return () => {
      onReady?.(null);
    };
  }, [onReady]);

  const registerStageApi = useCallback((stageApi) => {
    stageApiRef.current = stageApi;
    if (!stageApi) {
      return;
    }

    stageApi.applyPaintScheme(queuedSchemeRef.current);
    appliedSchemeRef.current = cloneScheme(queuedSchemeRef.current);
  }, []);

  return (
    <div className="viewer">
      <Canvas
        frameloop="always"
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <ShowroomScene activeModel={activeModel} onReady={registerStageApi} />
      </Canvas>
    </div>
  );
});

function ShowroomScene({ activeModel, onReady }) {
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const { invalidate } = useThree();

  const registerCarStage = useCallback((carStageApi) => {
    if (!carStageApi) {
      onReady?.(null);
      return;
    }

    setLayout(carStageApi.layout);
    onReady?.({
      applyPaintScheme(nextScheme) {
        carStageApi.applyPaintScheme(nextScheme);
        invalidate();
      },
    });
  }, [invalidate, onReady]);

  useLayoutEffect(() => {
    if (!cameraRef.current || !controlsRef.current) {
      return;
    }

    cameraRef.current.position.set(...CAMERA_POSITION);
    cameraRef.current.lookAt(...CONTROL_TARGET);

    controlsRef.current.target.set(...CONTROL_TARGET);
    controlsRef.current.minDistance = 1.5;
    controlsRef.current.maxDistance = 10;
    controlsRef.current.update();
    invalidate();
  }, [invalidate, layout]);

  return (
    <>
      <color attach="background" args={['#71767d']} />
      <fog attach="fog" args={['#71767d', 12, 24]} />

      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={CAMERA_POSITION}
        fov={CAMERA_FOV}
      />

      <ambientLight intensity={0.58} color="#ffffff" />
      <hemisphereLight intensity={1.05} color="#f3f6fa" groundColor="#596068" />
      <Environment resolution={128}>
        <Lightformer
          intensity={5.5}
          color="#ffffff"
          position={[0, 5.6, 4.6]}
          scale={[7.5, 5.5, 1]}
        />
        <Lightformer
          intensity={4.8}
          color="#f4f7fb"
          position={[-5.4, 2.2, 2.8]}
          rotation={[0, Math.PI / 3, 0]}
          scale={[5.2, 3.2, 1]}
        />
        <Lightformer
          intensity={4.4}
          color="#eef3f8"
          position={[5.4, 2.4, -2.2]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={[5.2, 3.2, 1]}
        />
        <Lightformer
          intensity={2.8}
          color="#dfe5eb"
          position={[0, 1.2, -6]}
          rotation={[0, Math.PI, 0]}
          scale={[10, 3.4, 1]}
        />
      </Environment>
      <directionalLight
        castShadow
        intensity={1.62}
        color="#ffffff"
        position={[4.8, 6.8, 5.6]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
      <spotLight
        intensity={24}
        angle={0.34}
        penumbra={0.85}
        distance={18}
        color="#ffffff"
        position={[0, 7.4, 1]}
      />
      <spotLight
        intensity={13}
        angle={0.3}
        penumbra={0.92}
        distance={16}
        color="#dfe5ec"
        position={[-5.6, 4.2, 3.4]}
      />
      <spotLight
        intensity={13}
        angle={0.28}
        penumbra={0.9}
        distance={16}
        color="#edf2f7"
        position={[5.2, 4.5, -2.8]}
      />

      <group rotation={[0, STAGE_ROTATION, 0]}>
        <DisplayRunway layout={layout} />
        <Suspense fallback={<Loader />}>
          <CarStage activeModel={activeModel} onReady={registerCarStage} />
        </Suspense>
      </group>

      <ContactShadows
        opacity={0.46}
        scale={layout.shadowScale}
        blur={2.1}
        far={3.5}
        resolution={512}
        color="#000000"
        position={[0, layout.shadowY, 0]}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.62}
        zoomSpeed={0.85}
        minDistance={1.5}
        maxDistance={10}
        minPolarAngle={1.22}
        maxPolarAngle={1.22}
      />
    </>
  );
}

function CarStage({ activeModel, onReady }) {
  const { scene } = useGLTF(activeModel.file);

  const preparedStage = useMemo(
    () => prepareCarStage(scene, activeModel),
    [activeModel, scene],
  );

  useEffect(() => {
    const carStageApi = {
      layout: preparedStage.layout,
      applyPaintScheme(nextScheme) {
        applyPaintSchemeToMaterials(preparedStage.paintMaterials, nextScheme);
      },
    };

    onReady?.(carStageApi);

    return () => {
      onReady?.(null);
    };
  }, [onReady, preparedStage]);

  useFrame((state, delta) => {
    animateCarMotion(preparedStage.motionRig, state.clock.elapsedTime, delta);
  });

  return <primitive object={preparedStage.model} />;
}

function DisplayRunway({ layout }) {
  const laneRefs = useRef([]);
  const propRefs = useRef([]);
  const edgeRefs = useRef([]);

  const roadway = useMemo(() => {
    const shoulderWidth = layout.platformWidth * 1.22;
    const roadWidth = layout.platformWidth;
    const visibleDepth = layout.platformDepth * ROAD_VISIBLE_DEPTH_MULTIPLIER;
    const shoulderHeight = Math.max(layout.platformHeight, 0.08);
    const roadHeight = shoulderHeight * 0.4;
    const laneCount = Math.max(40, Math.round(visibleDepth / ROAD_MARKER_GAP));
    const markerSpan = laneCount * ROAD_MARKER_GAP;
    const markerPositions = Array.from({ length: laneCount }, (_, index) => ({
      z: visibleDepth / 2 - index * ROAD_MARKER_GAP,
    }));
    const propCount = Math.max(18, Math.round(visibleDepth / RIGHT_PROP_GAP));
    const propSpan = propCount * RIGHT_PROP_GAP;
    const propPositions = Array.from({ length: propCount }, (_, index) => ({
      z: visibleDepth / 2 - index * RIGHT_PROP_GAP,
    }));
    const roadTopY = 0.01;
    const markerY = roadTopY + 0.17;
    const propY = roadTopY ;

    return {
      shoulderWidth,
      roadWidth,
      visibleDepth,
      shoulderHeight,
      roadHeight,
      laneCount,
      markerSpan,
      markerPositions,
      propCount,
      propSpan,
      propPositions,
      roadTopY,
      markerY,
      propY,
    };
  }, [layout.platformDepth, layout.platformHeight, layout.platformWidth]);

  useFrame((state, delta) => {
    const motion = ROAD_SCROLL_SPEED * delta;
    const markerWrapZ = roadway.visibleDepth / 2 + ROAD_MARKER_GAP;
    const propWrapZ = roadway.visibleDepth / 2 + RIGHT_PROP_GAP;

    laneRefs.current.forEach((marker) => {
      if (!marker) {
        return;
      }

      marker.position.z -= motion;
      if (marker.position.z < -markerWrapZ) {
        marker.position.z += roadway.markerSpan;
      }

      const travelRatio =
        (marker.position.z + roadway.visibleDepth / 2) / roadway.visibleDepth;
      marker.material.emissiveIntensity =
        0.82 + Math.sin(state.clock.elapsedTime * 3 + travelRatio * 10) * 0.18;
    });

    propRefs.current.forEach((prop) => {
      if (!prop) {
        return;
      }

      prop.position.z -= motion;
      if (prop.position.z < -propWrapZ) {
        prop.position.z += roadway.propSpan;
      }
    });

    edgeRefs.current.forEach((strip, index) => {
      if (!strip) {
        return;
      }

      strip.material.emissiveIntensity =
        0.12 + Math.sin(state.clock.elapsedTime * 2.4 + index * 0.7) * 0.025;
    });
  });

  return (
    <group position={[layout.roadShiftX, 0.018, 0]}>
      <RoundedBox
        args={[
          roadway.shoulderWidth,
          roadway.shoulderHeight,
          roadway.visibleDepth,
        ]}
        radius={0.16}
        smoothness={6}
        castShadow
        receiveShadow
        position={[0, -roadway.shoulderHeight / 2, 0]}
      >
        <meshStandardMaterial
          color="#12161b"
          metalness={0.16}
          roughness={0.9}
        />
      </RoundedBox>

      <RoundedBox
        args={[roadway.roadWidth, roadway.roadHeight, roadway.visibleDepth * 0.995]}
        radius={0.12}
        smoothness={6}
        castShadow
        receiveShadow
        position={[0, -roadway.roadHeight / 2 + 0.01, 0]}
      >
        <meshStandardMaterial
          color="#1e242b"
          metalness={0.08}
          roughness={0.94}
        />
      </RoundedBox>

      {[-1, 1].map((side, index) => (
        <mesh
          key={side}
          ref={(element) => {
            edgeRefs.current[index] = element;
          }}
          position={[
            side * roadway.roadWidth * 0.46,
            roadway.roadHeight * 0.16,
            0,
          ]}
          receiveShadow
        >
          <boxGeometry args={[0.06, 0.012, roadway.visibleDepth * 0.985]} />
          <meshStandardMaterial
            color="#f4f1e8"
            emissive="#c3ced8"
            emissiveIntensity={0.2}
            metalness={0.08}
            roughness={0.42}
          />
        </mesh>
      ))}

      {roadway.markerPositions.map((marker, index) => (
        <mesh
          key={index}
          ref={(element) => {
            laneRefs.current[index] = element;
          }}
          position={[0, roadway.markerY, marker.z]}
          receiveShadow
        >
          <boxGeometry
            args={[0.24, 0.055, ROAD_MARKER_LENGTH]}
          />
          <meshStandardMaterial
            color="#fff4d6"
            emissive="#fff4d6"
            emissiveIntensity={0.92}
            metalness={0.18}
            roughness={0.22}
          />
        </mesh>
      ))}

      {roadway.propPositions.map((prop, index) => (
        <mesh
          key={`prop-${index}`}
          ref={(element) => {
            propRefs.current[index] = element;
          }}
          position={[roadway.shoulderWidth * 0.42, roadway.propY, prop.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.16, 0.18, 0.52]} />
          <meshStandardMaterial
            color="#b9c8d6"
            emissive="#d7e3ef"
            emissiveIntensity={0.26}
            metalness={0.16}
            roughness={0.32}
          />
        </mesh>
      ))}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, roadway.roadTopY + 0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[roadway.roadWidth * 0.98, roadway.visibleDepth * 0.99]} />
        <meshStandardMaterial
          color="#20262d"
          metalness={0.05}
          roughness={0.92}
        />
      </mesh>
    </group>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="loader-badge">Preparing the private floor...</div>
    </Html>
  );
}

function prepareCarStage(sourceScene, activeModel) {
  const model = clone(sourceScene);
  const junkNodes = [];
  const paintMaterials = [];
  const wheelMeshes = [];

  model.traverse((child) => {
    if (child.name?.startsWith('desirefx.me_')) {
      junkNodes.push(child);
    }

    if (!child.isMesh) {
      return;
    }

    const sourceMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const materialNames = sourceMaterials.map(
      (sourceMaterial) => sourceMaterial?.name ?? '',
    );

    const clonedMaterials = sourceMaterials.map((sourceMaterial) =>
      prepareMaterial(
        sourceMaterial,
        child.name ?? '',
        activeModel,
        paintMaterials,
      ),
    );

    child.material = Array.isArray(child.material)
      ? clonedMaterials
      : clonedMaterials[0];
    child.castShadow = true;
    child.receiveShadow = true;

    if (isWheelMesh(child.name ?? '', materialNames)) {
      wheelMeshes.push(child);
    }
  });

  junkNodes.forEach((child) => {
    child.parent?.remove(child);
  });

  const layout = fitModelToStage(model, activeModel);
  paintMaterials.forEach((material) => {
    configurePaintMask(material, layout.paintMask);
  });
  const motionRig = buildMotionRig(model, wheelMeshes);

  return {
    model,
    paintMaterials,
    layout,
    motionRig,
  };
}

function prepareMaterial(sourceMaterial, nodeName, activeModel, paintMaterials) {
  if (!sourceMaterial?.clone) {
    return sourceMaterial;
  }

  const material = sourceMaterial.clone();
  const materialName = material.name ?? '';

  if (isTrimNode(nodeName)) {
    material.color?.copy(trimColor);
    material.emissive?.set('#100907');
    material.emissiveIntensity = 0.04;
    material.metalness = 0.58;
    material.roughness = 0.18;
    return material;
  }

  if (isPaintNode(nodeName, materialName, activeModel)) {
    material.color?.copy(paintBase);
    material.emissive?.set('#0f0c0a');
    material.emissiveIntensity = 0.04;
    material.metalness = 0.82;
    material.roughness = 0.12;
    material.envMapIntensity = 1.2;
    setupPaintMaterial(material);
    paintMaterials.push(material);
    return material;
  }

  if (isChromeNode(nodeName)) {
    material.color?.lerp(chromeWarmth, 0.18);
    material.emissive?.set('#4b3418');
    material.emissiveIntensity = 0.02;
    material.metalness = 0.96;
    material.roughness = 0.12;
    material.envMapIntensity = 1.25;
    return material;
  }

  if (isGlassNode(nodeName)) {
    material.transparent = true;
    material.opacity = Math.min(material.opacity ?? 1, 0.76);
    material.roughness = 0.02;
    material.metalness = 0.02;
    material.envMapIntensity = 1.15;
    return material;
  }

  return material;
}

function fitModelToStage(model, activeModel) {
  const rawBox = new Box3().setFromObject(model);
  const rawSize = rawBox.getSize(new Vector3());
  const rawCenter = rawBox.getCenter(new Vector3());

  model.position.sub(rawCenter);

  const footprintLongestSide = Math.max(rawSize.x, rawSize.z);
  const scaleFactor =
    (activeModel?.targetLength ?? MODEL_TARGET_LENGTH) / footprintLongestSide;

  model.scale.setScalar(scaleFactor);
  model.updateMatrixWorld(true);

  const groundedBox = new Box3().setFromObject(model);
  model.position.y -= groundedBox.min.y;
  model.position.y += 0.2;
  model.updateMatrixWorld(true);

  const finalBox = new Box3().setFromObject(model);
  const finalSize = finalBox.getSize(new Vector3());
  const paintProfile = activeModel?.paintProfile ?? DEFAULT_PAINT_PROFILE;

  const laneWidth = Math.max(finalSize.x * 1.14, 3.2);
  const platformWidth = Math.max(laneWidth * 2.02, 6.4);
  const platformDepth = Math.max(finalSize.z * 1.46, 9.6);
  const platformHeight = MathUtils.clamp(
    Math.max(platformWidth, platformDepth) * 0.012,
    0.08,
    0.12,
  );

  return {
    platformWidth,
    platformDepth,
    platformHeight,
    roadShiftX: -platformWidth * 0.23,
    shadowScale: Math.max(platformWidth, platformDepth) * 1.02,
    shadowY: 0.04,
    paintMask: {
      topStart: finalBox.min.y + finalSize.y * paintProfile.topStart,
      topEnd: finalBox.min.y + finalSize.y * paintProfile.topEnd,
      hoodStart: finalBox.max.z - finalSize.z * paintProfile.hoodStart,
      hoodEnd: finalBox.max.z - finalSize.z * paintProfile.hoodEnd,
      hoodHeightStart:
        finalBox.min.y + finalSize.y * paintProfile.hoodHeightStart,
      hoodHeightEnd:
        finalBox.min.y + finalSize.y * paintProfile.hoodHeightEnd,
    },
  };
}

function applyPaintSchemeToMaterials(paintMaterials, nextScheme) {
  paintMaterials.forEach((material) => {
    updatePaintMaterial(material, nextScheme);
  });
}

function isPaintNode(nodeName, materialName, activeModel) {
  const normalizedNodeName = nodeName.toLowerCase();
  const normalizedMaterialName = materialName.toLowerCase();

  if (
    normalizedNodeName.includes('plastic') ||
    normalizedNodeName.includes('interior') ||
    normalizedMaterialName.includes('interior')
  ) {
    return false;
  }

  if (
    matchesModelPaintSelector(
      activeModel?.paintSelectors,
      normalizedNodeName,
      normalizedMaterialName,
    )
  ) {
    return true;
  }

  return (
    nodeName.includes('CarPaint') ||
    normalizedNodeName.includes('paint') ||
    normalizedMaterialName.includes('paint') ||
    normalizedMaterialName.includes('car_paint') ||
    normalizedNodeName.includes('car_paint') ||
    normalizedNodeName.startsWith('body') ||
    normalizedNodeName.startsWith('hood') ||
    normalizedNodeName.startsWith('door') ||
    materialName === 'Mphong4SG1' ||
    materialName === 'Mphong5SG1' ||
    materialName === 'Mphong6SG1'
  );
}

function matchesModelPaintSelector(
  paintSelectors,
  normalizedNodeName,
  normalizedMaterialName,
) {
  if (!paintSelectors) {
    return false;
  }

  const materialNames = paintSelectors.materialNames ?? [];
  const nodeNameIncludes = paintSelectors.nodeNameIncludes ?? [];
  const matchesMaterial =
    materialNames.length === 0 ||
    materialNames.includes(normalizedMaterialName);
  const matchesNode =
    nodeNameIncludes.length === 0 ||
    nodeNameIncludes.some((token) => normalizedNodeName.includes(token));

  return matchesMaterial && matchesNode;
}

function isWheelMesh(nodeName, materialNames) {
  const signatureTokens = tokenizeNodeSignature(
    `${nodeName} ${materialNames.join(' ')}`,
  );

  return (
    WHEEL_TOKENS.some((token) => signatureTokens.includes(token)) &&
    !WHEEL_BLOCKED_TOKENS.some((token) => signatureTokens.includes(token))
  );
}

function buildMotionRig(model, wheelMeshes) {
  model.updateMatrixWorld(true);
  const wheelRoots = [...new Set(
    wheelMeshes
      .map((mesh) => findWheelRoot(mesh, model))
      .filter(Boolean),
  )];

  return {
    model,
    basePositionY: model.position.y,
    wheelMeshes: wheelRoots
      .map((wheelRoot) => createWheelMotionConfig(wheelRoot))
      .filter(Boolean),
  };
}

function tokenizeNodeSignature(value) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9]+)/g, '$1 $2')
    .replace(/([0-9])([A-Z][a-z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function hasWheelToken(value) {
  const tokens = tokenizeNodeSignature(value);
  return WHEEL_TOKENS.some((token) => tokens.includes(token));
}

function hasWheelPositionToken(value) {
  const tokens = tokenizeNodeSignature(value);
  return WHEEL_POSITION_TOKENS.some((token) => tokens.includes(token));
}

function findWheelRoot(mesh, stopAt) {
  let current = mesh;
  let fallbackRoot = null;
  let positionedRoot = null;

  while (current && current !== stopAt) {
    const name = current.name?.toLowerCase() ?? '';
    if (hasWheelToken(name)) {
      fallbackRoot = current;
      if (hasWheelPositionToken(name)) {
        positionedRoot = current;
      }
    }
    current = current.parent;
  }

  return positionedRoot ?? fallbackRoot;
}

function createWheelMotionConfig(wheelRoot) {
  wheelRoot.updateMatrixWorld(true);
  const worldSize = new Box3().setFromObject(wheelRoot).getSize(new Vector3());
  const dimensions = [worldSize.x, worldSize.y, worldSize.z];
  const smallestAxisIndex = dimensions.indexOf(Math.min(...dimensions));
  const axis = ['x', 'y', 'z'][smallestAxisIndex];
  const wheelRadius =
    Math.max(...dimensions.filter((_, index) => index !== smallestAxisIndex)) / 2;

  if (!Number.isFinite(wheelRadius) || wheelRadius <= 0.05) {
    return null;
  }

  return {
    mesh: wheelRoot,
    axis,
    radius: wheelRadius,
    direction: 1,
  };
}

function animateCarMotion(motionRig, elapsedTime, delta) {
  if (!motionRig) {
    return;
  }

  motionRig.model.position.y =
    motionRig.basePositionY + Math.sin(elapsedTime * BODY_SWAY_SPEED) * BODY_SWAY_AMOUNT;

  motionRig.wheelMeshes.forEach((wheel) => {
    const angularDelta =
      (ROAD_SCROLL_SPEED * delta * WHEEL_SPIN_FACTOR) / Math.max(wheel.radius, 0.12);
    wheel.mesh.rotation[wheel.axis] += angularDelta * wheel.direction;
  });
}

function isTrimNode(nodeName) {
  return nodeName.includes('CarPaint_Trim_PianoBlack');
}

function isChromeNode(nodeName) {
  return (
    nodeName.includes('Chrome') ||
    nodeName.includes('Badge') ||
    nodeName.includes('Grille')
  );
}

function isGlassNode(nodeName) {
  return nodeName.includes('Glass');
}

function configurePaintMask(material, paintMask) {
  material.userData.paintMask = {
    ...paintMask,
    forwardAxis: STAGE_FORWARD_AXIS.clone(),
  };

  if (material.userData.paintShader) {
    const {
      topStart,
      topEnd,
      hoodStart,
      hoodEnd,
      hoodHeightStart,
      hoodHeightEnd,
      forwardAxis,
    } = material.userData.paintMask;

    material.userData.paintShader.uniforms.uPaintTopStart.value = topStart;
    material.userData.paintShader.uniforms.uPaintTopEnd.value = topEnd;
    material.userData.paintShader.uniforms.uPaintHoodStart.value = hoodStart;
    material.userData.paintShader.uniforms.uPaintHoodEnd.value = hoodEnd;
    material.userData.paintShader.uniforms.uPaintHoodHeightStart.value =
      hoodHeightStart;
    material.userData.paintShader.uniforms.uPaintHoodHeightEnd.value =
      hoodHeightEnd;
    material.userData.paintShader.uniforms.uPaintForwardAxis.value.copy(
      forwardAxis,
    );
  }
}

function setupPaintMaterial(material) {
  if (material.userData.paintMaterial) {
    return;
  }

  material.userData.paintMaterial = true;
  material.userData.paintLower = new Color(DEFAULT_SCHEME.primary);
  material.userData.paintUpper = new Color(DEFAULT_SCHEME.secondary);
  material.userData.paintMode = 1;
  material.userData.paintMask = {
    ...DEFAULT_LAYOUT.paintMask,
    forwardAxis: STAGE_FORWARD_AXIS.clone(),
  };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaintLower = {
      value: material.userData.paintLower.clone(),
    };
    shader.uniforms.uPaintUpper = {
      value: material.userData.paintUpper.clone(),
    };
    shader.uniforms.uPaintMode = {
      value: material.userData.paintMode,
    };
    shader.uniforms.uPaintTopStart = {
      value: material.userData.paintMask.topStart,
    };
    shader.uniforms.uPaintTopEnd = {
      value: material.userData.paintMask.topEnd,
    };
    shader.uniforms.uPaintHoodStart = {
      value: material.userData.paintMask.hoodStart,
    };
    shader.uniforms.uPaintHoodEnd = {
      value: material.userData.paintMask.hoodEnd,
    };
    shader.uniforms.uPaintHoodHeightStart = {
      value: material.userData.paintMask.hoodHeightStart,
    };
    shader.uniforms.uPaintHoodHeightEnd = {
      value: material.userData.paintMask.hoodHeightEnd,
    };
    shader.uniforms.uPaintForwardAxis = {
      value: material.userData.paintMask.forwardAxis.clone(),
    };

    material.userData.paintShader = shader;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vPaintWorldPosition;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvPaintWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform vec3 uPaintLower;',
          'uniform vec3 uPaintUpper;',
          'uniform float uPaintMode;',
          'uniform float uPaintTopStart;',
          'uniform float uPaintTopEnd;',
          'uniform float uPaintHoodStart;',
          'uniform float uPaintHoodEnd;',
          'uniform float uPaintHoodHeightStart;',
          'uniform float uPaintHoodHeightEnd;',
          'uniform vec3 uPaintForwardAxis;',
          'varying vec3 vPaintWorldPosition;',
        ].join('\n'),
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        [
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'float upperBodyMask = smoothstep(',
          '  uPaintTopStart,',
          '  uPaintTopEnd,',
          '  vPaintWorldPosition.y',
          ');',
          'float hoodMask = smoothstep(',
          '  uPaintHoodStart,',
          '  uPaintHoodEnd,',
          '  dot(vPaintWorldPosition, uPaintForwardAxis)',
          ') * smoothstep(',
          '  uPaintHoodHeightStart,',
          '  uPaintHoodHeightEnd,',
          '  vPaintWorldPosition.y',
          ');',
          'float paintBlend = max(upperBodyMask, hoodMask);',
          'vec3 paintTint = mix(',
          '  uPaintLower,',
          '  mix(uPaintLower, uPaintUpper, clamp(paintBlend, 0.0, 1.0)),',
          '  uPaintMode',
          ');',
          'diffuseColor.rgb *= paintTint;',
        ].join('\n'),
      );
  };

  material.customProgramCacheKey = () => 'maybach-paint-v3';
  material.needsUpdate = true;
}

function updatePaintMaterial(material, paintScheme) {
  material.userData.paintLower.set(paintScheme.primary);
  material.userData.paintUpper.set(
    paintScheme.mode === 'duotone'
      ? paintScheme.secondary
      : paintScheme.primary,
  );
  material.userData.paintMode = paintScheme.mode === 'duotone' ? 1 : 0;

  if (material.userData.paintShader) {
    material.userData.paintShader.uniforms.uPaintLower.value.copy(
      material.userData.paintLower,
    );
    material.userData.paintShader.uniforms.uPaintUpper.value.copy(
      material.userData.paintUpper,
    );
    material.userData.paintShader.uniforms.uPaintMode.value =
      material.userData.paintMode;
  }
}

function cloneScheme(paintScheme) {
  return {
    mode: paintScheme.mode,
    primary: paintScheme.primary,
    secondary: paintScheme.secondary,
  };
}

function areSchemesEqual(left, right) {
  return (
    left.mode === right.mode &&
    left.primary === right.primary &&
    left.secondary === right.secondary
  );
}

MODEL_LIBRARY.forEach((model) => {
  useGLTF.preload(model.file);
});

export default ShowroomViewer;
