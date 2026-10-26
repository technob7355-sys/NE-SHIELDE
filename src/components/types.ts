export interface ZoneLocation {
  id: string
  name: string
  state: string
  lat: number
  lng: number
  slope: number
}

export interface ZoneWeather {
  zoneId: string
  rainfall: number
  rainfall3d: number
  rainfall30d: number
  soilMoisture: number
  fetchedAt: string
  sourceUrl: string
}

export interface BreakdownItem {
  label: string
  points: number
  max: number
}

export interface Prediction {
  score: number
  level: string
  breakdown: BreakdownItem[]
}

export interface ZoneWithScore {
  location: ZoneLocation
  weather: ZoneWeather | null
  prediction: Prediction | null
  error: string | null
}

export type TabId = 'home' | 'overview' | 'map' | 'accuracy' | 'report'
