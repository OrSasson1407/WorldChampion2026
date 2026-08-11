import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Country, War } from '../game/core/Models';
import { getCountryColor } from '../game/utils/countryUtils';

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

interface Props {
  countries: Country[];
  allCountries: Record<string, Country>;
  wars: Record<string, War>;
  onSelectCountry: (id: string) => void;
  selectedCountryId: string | null;
}

export const MapRenderer: React.FC<Props> = ({ countries, allCountries, wars, onSelectCountry, selectedCountryId }) => {
  const [tooltip, setTooltip] = useState<{ x: number, y: number, name: string, population: number, gdp: number } | null>(null);

  return (
    <div className="border p-4 bg-blue-50 relative">
      <h2 className="text-xl font-semibold mb-2">World Map</h2>
      <ComposableMap 
        projection="geoEqualEarth" 
        projectionConfig={{ scale: 147, center: [0, 0] }}
        width={800} 
        height={400}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const country = countries.find(c => c.name === geo.properties.name);
              const isSelected = country && selectedCountryId === country.id;
              const isWar = country && Object.values(wars).some(w => w.attackerId === country.id || w.defenderId === country.id);

              return (
                <Geography
                  key={geo.rsmKey}
                  id={country ? country.id : undefined}
                  geography={geo}
                  fill={country ? getCountryColor(country, allCountries) : "#D6D6DA"}
                  stroke={isWar ? "#FF0000" : (isSelected ? "#000" : "#FFF")}
                  strokeWidth={isWar ? 2.5 : (isSelected ? 2 : 0.5)}
                  style={{
                    default: { outline: "none", transition: "all 0.3s ease-in-out" },
                    hover: { 
                        outline: "none", 
                        fill: country ? "#F53" : "#D6D6DA", 
                        cursor: "pointer", 
                        transition: "all 0.3s ease-in-out" 
                    },
                    pressed: { outline: "none" }
                  }}
                  onMouseEnter={(evt) => {
                    if (country) {
                      setTooltip({
                        x: evt.clientX,
                        y: evt.clientY,
                        name: country.name,
                        population: country.population,
                        gdp: country.gdp
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => country && onSelectCountry(country.id)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip && (
        <div
          className="absolute bg-white p-2 border shadow-lg text-sm z-50 pointer-events-none rounded"
          style={{ top: tooltip.y - 100, left: tooltip.x - 50 }}
        >
          <strong>{tooltip.name}</strong>
          <p>Pop: {tooltip.population.toLocaleString()}</p>
          <p>GDP: ${tooltip.gdp.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};
