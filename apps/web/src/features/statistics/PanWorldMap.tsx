import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';

export type MapCity = {
  color: string;
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  value: string;
};

type CityPosition = { id: string; x: number; y: number };
type Offset = { x: number; y: number };

const land = feature(
  landTopology as unknown as Topology,
  (landTopology as unknown as Topology).objects.land as GeometryCollection,
) as unknown as FeatureCollection<Geometry>;

function hash2d(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawHexagon(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 3 * index + Math.PI / 6;
    const pointX = x + radius * Math.cos(angle);
    const pointY = y + radius * Math.sin(angle);
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

function RepeatingHexMap({ cities, onPositionsChange }: {
  cities: readonly MapCity[];
  onPositionsChange: (positions: CityPosition[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const panelWidth = bounds.width / 3;
      const ratio = Math.min(window.devicePixelRatio || 1, 2.25);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);

      const projection = geoNaturalEarth1().fitExtent(
        [[4, 20], [panelWidth - 4, bounds.height - 14]],
        land,
      );
      const verticalCenter = bounds.height * .48;
      const verticalScale = 1.14;
      const verticalShift = 8;
      const maskWidth = Math.ceil(panelWidth);
      const maskHeight = Math.ceil(bounds.height);
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskWidth;
      maskCanvas.height = maskHeight;
      const maskContext = maskCanvas.getContext('2d');
      if (!maskContext) return;
      maskContext.translate(0, verticalCenter + verticalShift);
      maskContext.scale(1, verticalScale);
      maskContext.translate(0, -verticalCenter);
      maskContext.beginPath();
      geoPath(projection, maskContext)(land);
      maskContext.fillStyle = '#000';
      maskContext.fill();
      const landMask = maskContext.getImageData(0, 0, maskWidth, maskHeight).data;
      const radius = Math.max(4.6, panelWidth / 176);
      const horizontalStep = Math.sqrt(3) * radius;
      const verticalStep = radius * 1.5;
      const cityPoints = cities.map((city) => ({
        ...city,
        point: (() => {
          const point = projection([city.longitude, city.latitude]) ?? [0, 0];
          return [point[0], (point[1] - verticalCenter) * verticalScale + verticalCenter + verticalShift] as [number, number];
        })(),
      }));

      onPositionsChange(cityPoints.map((city) => ({
        id: city.id,
        x: city.point[0] / panelWidth * 100,
        y: city.point[1] / bounds.height * 100,
      })));

      context.lineWidth = Math.max(.7, radius * .1);
      for (let copy = 0; copy < 3; copy += 1) {
        const panelOffset = copy * panelWidth;
        for (let row = 0, y = radius; y < bounds.height - radius; row += 1, y += verticalStep) {
          const offset = row % 2 ? horizontalStep / 2 : 0;
          for (let x = radius + offset; x < panelWidth - radius; x += horizontalStep) {
            const projectedY = (y - verticalCenter - verticalShift) / verticalScale + verticalCenter;
            const coordinate = projection.invert?.([x, projectedY]);
            const maskIndex = (Math.round(y) * maskWidth + Math.round(x)) * 4 + 3;
            if (!coordinate || coordinate[1] < -58 || coordinate[1] > 80 || landMask[maskIndex] === 0) continue;

            let nearest = Number.POSITIVE_INFINITY;
            let heatIndex = -1;
            cityPoints.forEach((city, index) => {
              const distance = Math.hypot(x - city.point[0], y - city.point[1]);
              if (distance < nearest) {
                nearest = distance;
                heatIndex = index;
              }
            });
            const noise = hash2d(x, y);
            let fill = '#ffffff';
            if (nearest < radius * 2.7) fill = heatIndex === 1 ? '#7757de' : '#d63048';
            else if (nearest < radius * 7 && noise > nearest / (radius * 9.5)) fill = noise > .84 ? '#da38c9' : '#6f5bd8';
            else if (nearest < radius * 11 && noise > .72) fill = noise > .93 ? '#b132d1' : '#9d8de4';
            else if (noise > .987) fill = '#7660df';

            drawHexagon(context, x + panelOffset, y, radius * .91);
            context.fillStyle = fill;
            context.fill();
            context.strokeStyle = fill === '#ffffff' ? '#d9dce8' : 'rgba(103,84,200,.22)';
            context.stroke();
          }
        }
      }
    };

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [cities, onPositionsChange]);

  return <canvas aria-label="High-resolution hexagonal world map" ref={canvasRef} role="img" />;
}

export function PanWorldMap({ cities, onSelectCity, selectedCityId }: {
  cities: readonly MapCity[];
  onSelectCity: (city: MapCity) => void;
  selectedCityId: string;
}) {
  const [positions, setPositions] = useState<CityPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const inertiaRef = useRef<number | null>(null);
  const offsetRef = useRef<Offset>({ x: 0, y: 0 });
  const pendingRef = useRef<Offset>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef({ height: 1, lastTime: 0, lastX: 0, lastY: 0, moved: false, originX: 0, originY: 0, pointerId: -1, startX: 0, startY: 0, velocityX: 0, velocityY: 0, width: 1 });
  const handlePositionsChange = useMemo(() => (next: CityPosition[]) => {
    setPositions((current) => current.length === next.length && current.every((item, index) => (
      item.id === next[index].id && Math.abs(item.x - next[index].x) < .02 && Math.abs(item.y - next[index].y) < .02
    )) ? current : next);
  }, []);

  function applyOffset(next: Offset) {
    const { width, height } = dragRef.current;
    let x = next.x;
    while (x > width / 2) x -= width;
    while (x < -width / 2) x += width;
    const verticalLimit = Math.min(140, height * .18);
    const y = Math.max(-verticalLimit, Math.min(verticalLimit, next.y));
    offsetRef.current = { x, y };
    if (layerRef.current) layerRef.current.style.transform = `translate3d(calc(-33.333333% + ${x}px), ${y}px, 0)`;
  }

  function stopMotion() {
    if (inertiaRef.current !== null) cancelAnimationFrame(inertiaRef.current);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    inertiaRef.current = null;
    frameRef.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    stopMotion();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      height: bounds.height,
      lastTime: performance.now(),
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      originX: offsetRef.current.x,
      originY: offsetRef.current.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      velocityX: 0,
      velocityY: 0,
      width: bounds.width,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(8, now - dragRef.current.lastTime);
    const deltaX = event.clientX - dragRef.current.lastX;
    const deltaY = event.clientY - dragRef.current.lastY;
    dragRef.current.velocityX = deltaX / elapsed;
    dragRef.current.velocityY = deltaY / elapsed;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
    dragRef.current.lastTime = now;
    if (Math.hypot(deltaX, deltaY) > .5) dragRef.current.moved = true;
    pendingRef.current = {
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    };
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(() => {
      applyOffset(pendingRef.current);
      frameRef.current = null;
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.pointerId = -1;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      applyOffset(pendingRef.current);
    }
    setIsDragging(false);
    if (dragRef.current.moved) setHasMoved(true);
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!dragRef.current.moved || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let velocityX = dragRef.current.velocityX;
    let velocityY = dragRef.current.velocityY;
    let previousTime = performance.now();
    const glide = (time: number) => {
      const elapsed = Math.min(32, time - previousTime);
      previousTime = time;
      const decay = Math.pow(.9, elapsed / 16.67);
      velocityX *= decay;
      velocityY *= decay;
      if (Math.hypot(velocityX, velocityY) < .006) {
        inertiaRef.current = null;
        return;
      }
      applyOffset({ x: offsetRef.current.x + velocityX * elapsed, y: offsetRef.current.y + velocityY * elapsed });
      inertiaRef.current = requestAnimationFrame(glide);
    };
    inertiaRef.current = requestAnimationFrame(glide);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const deltas: Partial<Record<typeof event.key, Offset>> = {
      ArrowDown: { x: 0, y: 32 },
      ArrowLeft: { x: -42, y: 0 },
      ArrowRight: { x: 42, y: 0 },
      ArrowUp: { x: 0, y: -32 },
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    dragRef.current.width = bounds.width;
    dragRef.current.height = bounds.height;
    applyOffset({ x: offsetRef.current.x + delta.x, y: offsetRef.current.y + delta.y });
    setHasMoved(true);
  }

  useEffect(() => stopMotion, []);

  return (
    <div
      aria-label="Global messaging coverage map"
      aria-roledescription="freely pannable world map"
      className={`statistics-map${isDragging ? ' statistics-map-dragging' : ''}`}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="region"
      tabIndex={0}
    >
      <div className="statistics-map-layer" ref={layerRef}>
        <RepeatingHexMap cities={cities} onPositionsChange={handlePositionsChange} />
        {[-1, 0, 1].flatMap((copy) => cities.map((city, index) => {
          const Icon = index === 1 ? BuildingStorefrontIcon : index >= 2 ? SignalIcon : BuildingOffice2Icon;
          const position = positions.find(({ id }) => id === city.id);
          return (
            <button
              aria-hidden={copy === 0 ? undefined : true}
              aria-label={`View ${city.name}: ${city.value} messages`}
              aria-pressed={selectedCityId === city.id}
              className="statistics-city-marker"
              key={`${copy}-${city.id}`}
              onClick={() => onSelectCity(city)}
              style={{
                '--marker-color': city.color,
                left: `${(copy + 1) * 100 / 3 + (position?.x ?? 50) / 3}%`,
                opacity: position ? 1 : 0,
                top: `${position?.y ?? 50}%`,
              } as React.CSSProperties}
              tabIndex={copy === 0 ? undefined : -1}
              type="button"
            >
              <span className="statistics-city-icon"><Icon aria-hidden="true" /></span>
              <span className="statistics-city-copy"><small>{city.name}</small><strong>{city.value}</strong></span>
            </button>
          );
        }))}
      </div>
      <div className="statistics-map-controls">
        <span>Drag to explore</span>
        <button
          disabled={!hasMoved}
          onClick={() => {
            stopMotion();
            const layer = layerRef.current;
            if (layer) layer.style.transition = 'transform 380ms cubic-bezier(.22,1,.36,1)';
            applyOffset({ x: 0, y: 0 });
            window.setTimeout(() => { if (layer) layer.style.transition = ''; }, 400);
            setHasMoved(false);
          }}
          type="button"
        >
          <ArrowPathIcon aria-hidden="true" /> Reset
        </button>
      </div>
    </div>
  );
}
