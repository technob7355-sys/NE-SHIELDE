// NE-SHIELD V4 — the 20 monitored risk zones.
// Only static geography lives here (name / state / coordinates / slope angle).
// All weather and risk data comes from the API pipeline (see ml/).
export interface ZoneLocation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  /** Representative slope angle of the zone, in degrees. */
  slope: number;
}

export const LOCATIONS: ZoneLocation[] = [
  { id: 'rz-1', name: 'NH-10 Mile 29, Sevoke-Rangpo', state: 'Sikkim', lat: 27.17, lng: 88.52, slope: 34 },
  { id: 'rz-2', name: 'Dzongu Valley Upper Slopes', state: 'Sikkim', lat: 27.53, lng: 88.54, slope: 41 },
  { id: 'rz-3', name: 'Cherrapunji (Sohra) Escarpment', state: 'Meghalaya', lat: 25.28, lng: 91.73, slope: 38 },
  { id: 'rz-4', name: 'NH-6 Sonapur Tunnel Corridor', state: 'Meghalaya', lat: 25.1, lng: 92.35, slope: 36 },
  { id: 'rz-5', name: 'Mangan District Headquarters Ridge', state: 'Sikkim', lat: 27.51, lng: 88.53, slope: 35 },
  { id: 'rz-6', name: 'Sela Pass Approach (NH-13)', state: 'Arunachal Pradesh', lat: 27.5, lng: 92.1, slope: 44 },
  { id: 'rz-7', name: 'Haflong Hill Section (Dima Hasao)', state: 'Assam', lat: 25.17, lng: 93.02, slope: 31 },
  { id: 'rz-8', name: 'Bhalukpong-Bomdila Trans-Himalayan Link', state: 'Arunachal Pradesh', lat: 27.01, lng: 92.56, slope: 37 },
  { id: 'rz-9', name: 'Mawsynram Plateau Edge', state: 'Meghalaya', lat: 25.3, lng: 91.58, slope: 32 },
  { id: 'rz-10', name: 'Singtam-Bermoik Flank', state: 'Sikkim', lat: 27.24, lng: 88.5, slope: 29 },
  { id: 'rz-11', name: 'Pasighat Foothill Slope', state: 'Arunachal Pradesh', lat: 28.07, lng: 95.33, slope: 33 },
  { id: 'rz-12', name: 'Guwahati Naranarayan Slopes (Kamrup)', state: 'Assam', lat: 26.18, lng: 91.75, slope: 28 },
  { id: 'rz-13', name: 'Nongpoh Valley Escarpment', state: 'Meghalaya', lat: 25.9, lng: 91.88, slope: 27 },
  { id: 'rz-14', name: 'Roing-Mayodia Pass Ridge', state: 'Arunachal Pradesh', lat: 28.23, lng: 95.84, slope: 42 },
  { id: 'rz-15', name: 'Cachar Barak Valley Escarpment', state: 'Assam', lat: 24.83, lng: 92.8, slope: 26 },
  { id: 'rz-16', name: 'Dawki Border Pass Slopes', state: 'Meghalaya', lat: 25.18, lng: 92.02, slope: 30 },
  { id: 'rz-17', name: 'Gangtok Ranipool Highway Spur', state: 'Sikkim', lat: 27.3, lng: 88.6, slope: 25 },
  { id: 'rz-18', name: 'Dirang River Valley Terrace', state: 'Arunachal Pradesh', lat: 27.35, lng: 92.24, slope: 22 },
  { id: 'rz-19', name: 'Karimganj South Hills', state: 'Assam', lat: 24.87, lng: 92.35, slope: 16 },
  { id: 'rz-20', name: 'Tezpur-Brahmaputra Bluff', state: 'Assam', lat: 26.63, lng: 92.8, slope: 12 },
];
