import { Country } from '../core/Models';

export const getCountryColor = (country: Country, allCountries: Record<string, Country>): string => {
    const controller = allCountries[country.controllerId];
    return controller ? controller.color : country.color;
};
