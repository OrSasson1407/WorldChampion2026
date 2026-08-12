import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Country, War } from '../game/core/Models';
import { getCountryColor, buildCountryByIso3Index, DEFAULT_COUNTRY_COLOR } from '../game/utils/countryUtils';
import { WORLD_COUNTRIES_GEOJSON, WorldCountryProperties } from '../game/geo/worldGeo';

interface Props {
  countries: Country[];
  allCountries: Record<string, Country>;
  wars: Record<string, War>;
  onSelectCountry: (id: string) => void;
  selectedCountryId: string | null;
}

const DEFAULT_CENTER: [number, number] = [0, 20];
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export const MapRenderer: React.FC<Props> = ({ allCountries, wars, onSelectCountry, selectedCountryId }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; population: number; gdp: number } | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });

  // Geography (WORLD_COUNTRIES_GEOJSON) is static and never recomputed here.
  // Only this index - the bridge from map shapes to live game state - changes
  // when countries change hands.
  const countryByIso3 = useMemo(() => buildCountryByIso3Index(allCountries), [allCountries]);

  const isCountryAtWar = (countryId: string) =>
    (Object.values(wars) as War[]).some((w) => w.attackerId === countryId || w.defenderId === countryId);

  const handleZoomIn = () => setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, MAX_ZOOM) }));
  const handleZoomOut = () => setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, MIN_ZOOM) }));
  const handleReset = () => setPosition({ coordinates: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });

  return (
    <div className="border p-4 bg-blue-50 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">World Map</h2>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Zoom in"
            className="w-7 h-7 flex items-center justify-center bg-white border rounded hover:bg-gray-100"
            onClick={handleZoomIn}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            className="w-7 h-7 flex items-center justify-center bg-white border rounded hover:bg-gray-100"
            onClick={handleZoomOut}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Reset map"
            className="px-2 h-7 flex items-center justify-center bg-white border rounded hover:bg-gray-100 text-xs"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 147 }} width={800} height={400}>
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={(pos) => setPosition({ coordinates: pos.coordinates, zoom: pos.zoom })}
        >
          <Geographies geography={WORLD_COUNTRIES_GEOJSON}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const props = geo.properties as WorldCountryProperties;
                const country = countryByIso3[props.iso3];
                const isSelected = !!country && selectedCountryId === country.id;
                const isWar = !!country && isCountryAtWar(country.id);
                const fill = getCountryColor(country, allCountries);

                return (
                  <Geography
                    key={geo.rsmKey}
                    id={country ? country.id : undefined}
                    geography={geo}
                    fill={fill}
                    stroke={isWar ? '#FF0000' : isSelected ? '#111827' : '#FFFFFF'}
                    strokeWidth={isWar ? 2.5 : isSelected ? 2 : 0.5}
                    style={{
                      default: { outline: 'none', transition: 'fill 0.3s ease-in-out, stroke 0.2s ease-in-out' },
                      hover: {
                        outline: 'none',
                        fill: country ? shadeColor(fill) : DEFAULT_COUNTRY_COLOR,
                        cursor: country ? 'pointer' : 'default',
                        transition: 'fill 0.15s ease-in-out',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(evt) => {
                      if (country) {
                        setTooltip({
                          x: evt.clientX,
                          y: evt.clientY,
                          name: country.name,
                          population: country.population,
                          gdp: country.gdp,
                        });
                      } else {
                        setTooltip({ x: evt.clientX, y: evt.clientY, name: props.name, population: 0, gdp: 0 });
                      }
                    }}
                    onMouseMove={(evt) => {
                      setTooltip((t) => (t ? { ...t, x: evt.clientX, y: evt.clientY } : t));
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => country && onSelectCountry(country.id)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tooltip && (
        <div
          className="absolute bg-white p-2 border shadow-lg text-sm z-50 pointer-events-none rounded"
          style={{ top: tooltip.y - 100, left: tooltip.x - 50 }}
        >
          <strong>{tooltip.name}</strong>
          {tooltip.population > 0 && (
            <>
              <p>Pop: {tooltip.population.toLocaleString()}</p>
              <p>GDP: ${tooltip.gdp.toLocaleString()}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** Lightens/darkens a hex color slightly for a hover highlight, falling back gracefully on bad input. */
function shadeColor(hex: string): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return hex;
  const amount = 35;
  const [r, g, b] = [match[1], match[2], match[3]].map((c) =>
    Math.min(255, Math.max(0, parseInt(c, 16) + amount))
  );
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
