import type { SeasonNote } from './types';

const LABEL_TEXT = 'Typical season pattern, not a forecast' as const;

export const SEASON_NOTES_SOUTH_INDIA: SeasonNote[] = [
  {
    month: 1,
    monthName: 'January',
    label: LABEL_TEXT,
    headline: 'Pongal festival demand spike',
    details: 'Milk, sugar, and local transport fill up around mid-January Pongal holidays.',
    tags: ['Pongal demand spike', 'Extra milk & sugar orders'],
  },
  {
    month: 2,
    monthName: 'February',
    label: LABEL_TEXT,
    headline: 'Mild dry weather window',
    details: 'Roads and ports usually run smoothly across Tamil Nadu and Karnataka.',
    tags: ['Steady roads'],
  },
  {
    month: 3,
    monthName: 'March',
    label: LABEL_TEXT,
    headline: 'Early heatwave & water shortage risk',
    details: 'Rising heat starts squeezing dairy yield, fodder, and water-heavy plants.',
    tags: ['Heatwave', 'Water shortage'],
  },
  {
    month: 4,
    monthName: 'April',
    label: LABEL_TEXT,
    headline: 'Peak summer heatwave & power load',
    details: 'High heat and afternoon power cuts can slow small workshops and cold chains.',
    tags: ['Heatwave', 'Water shortage'],
  },
  {
    month: 5,
    monthName: 'May',
    label: LABEL_TEXT,
    headline: 'Late summer water shortage risk',
    details: 'Reservoirs run low before June rains; watch rural fodder and water-cooled plants.',
    tags: ['Heatwave', 'Water shortage'],
  },
  {
    month: 6,
    monthName: 'June',
    label: LABEL_TEXT,
    headline: 'Southwest monsoon begins on west coast',
    details: 'Heavy west-coast rains can slow Mangalore, Kochi, and Pune highway trucks.',
    tags: ['Southwest monsoon (west coast)'],
  },
  {
    month: 7,
    monthName: 'July',
    label: LABEL_TEXT,
    headline: 'Active southwest monsoon (west coast)',
    details: 'Watch ghat road delays from Pune, Kolhapur, Mangalore, and Nilgiri hills.',
    tags: ['Southwest monsoon (west coast)'],
  },
  {
    month: 8,
    monthName: 'August',
    label: LABEL_TEXT,
    headline: 'Southwest monsoon continues (west coast)',
    details: 'Landslides or flooded highways on the western ghats can delay inter-state freight.',
    tags: ['Southwest monsoon (west coast)'],
  },
  {
    month: 9,
    monthName: 'September',
    label: LABEL_TEXT,
    headline: 'Late southwest monsoon transition',
    details: 'West coast rains ease late in the month while east coast prepares for October.',
    tags: ['Southwest monsoon (west coast)'],
  },
  {
    month: 10,
    monthName: 'October',
    label: LABEL_TEXT,
    headline: 'Northeast rain, cyclone risk & Diwali rush',
    details: 'Heavy rain and cyclone alerts start on the east coast alongside festive demand spikes.',
    tags: ['Heavy rain & cyclone risk', 'Diwali demand spike'],
  },
  {
    month: 11,
    monthName: 'November',
    label: LABEL_TEXT,
    headline: 'Peak cyclone/flood risk & Diwali demand',
    details: 'Coastal Tamil Nadu and Andhra face flooding risks while festive orders peak.',
    tags: ['Heavy rain & cyclone risk', 'Diwali demand spike'],
  },
  {
    month: 12,
    monthName: 'December',
    label: LABEL_TEXT,
    headline: 'Heavy rain and cyclone risk',
    details: 'December storms around Chennai, Vellore, and Tuticorin can block coastal roads.',
    tags: ['Heavy rain & cyclone risk'],
  },
];

export function getSeasonNote(monthOneToTwelve?: number): SeasonNote {
  const m =
    monthOneToTwelve && monthOneToTwelve >= 1 && monthOneToTwelve <= 12
      ? Math.floor(monthOneToTwelve)
      : new Date().getMonth() + 1;
  return SEASON_NOTES_SOUTH_INDIA[m - 1] ?? SEASON_NOTES_SOUTH_INDIA[0];
}
