import { APIRequestContext, expect } from '@playwright/test';

export interface Movie {
  id?: string;
  title: string;
  synopsis: string;
  genre: string[];
  language: string;
  duration: number;
  release_date: string;
  cast: string[];
  director: string;
  poster_url?: string;
  trailer_url?: string;
  is_featured?: boolean;
  is_trending?: boolean;
}

export interface Theater {
  id?: string;
  name: string;
  location: string;
  city: string;
}

export interface Screen {
  id?: string;
  name: string;
  theater_id: string;
  capacity: number;
  seat_layout: Array<{
    row: string;
    number: number;
    category: 'vip' | 'premium' | 'regular';
    price: number;
  }>;
}

export interface Show {
  id?: string;
  movie_id: string;
  screen_id: string;
  show_date: string;
  show_time: string;
}

/**
 * Create a movie via API (admin only)
 */
export async function createMovie(
  request: APIRequestContext,
  token: string,
  movie: Movie
): Promise<Movie> {
  const response = await request.post('/api/movies', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: movie
  });

  expect(response.ok()).toBeTruthy();
  return await response.json() as Movie;
}

/**
 * Create a theater via API (admin only)
 */
export async function createTheater(
  request: APIRequestContext,
  token: string,
  theater: Theater
): Promise<Theater> {
  const response = await request.post('/api/theaters', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: theater
  });

  expect(response.ok()).toBeTruthy();
  return await response.json() as Theater;
}

/**
 * Create a screen via API (admin only)
 */
export async function createScreen(
  request: APIRequestContext,
  token: string,
  screen: Screen
): Promise<Screen> {
  const response = await request.post('/api/screens', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: screen
  });

  expect(response.ok()).toBeTruthy();
  return await response.json() as Screen;
}

/**
 * Create a show via API (admin only)
 */
export async function createShow(
  request: APIRequestContext,
  token: string,
  show: Show
): Promise<Show> {
  const response = await request.post('/api/shows', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: show
  });

  expect(response.ok()).toBeTruthy();
  return await response.json() as Show;
}

/**
 * Get all movies
 */
export async function getMovies(
  request: APIRequestContext,
  filters?: { search?: string; genre?: string; language?: string }
): Promise<Movie[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.genre) params.append('genre', filters.genre);
  if (filters?.language) params.append('language', filters.language);

  const url = `/api/movies${params.toString() ? '?' + params.toString() : ''}`;
  const response = await request.get(url);

  expect(response.ok()).toBeTruthy();
  return await response.json() as Movie[];
}

/**
 * Generate sample seat layout
 */
export function generateSeatLayout(rows: number = 8, seatsPerRow: number = 10): Screen['seat_layout'] {
  const layout: Screen['seat_layout'] = [];
  const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let r = 0; r < rows; r++) {
    for (let s = 1; s <= seatsPerRow; s++) {
      let category: 'vip' | 'premium' | 'regular';
      let price: number;

      if (r < 2) {
        category = 'vip';
        price = 50;
      } else if (r < 5) {
        category = 'premium';
        price = 30;
      } else {
        category = 'regular';
        price = 20;
      }

      layout.push({
        row: rowLetters[r],
        number: s,
        category,
        price
      });
    }
  }

  return layout;
}
