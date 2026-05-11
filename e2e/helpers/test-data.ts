import { Movie, Theater, Screen, Show } from './api.helper';
import { generateSeatLayout } from './api.helper';

/**
 * Sample movie data for testing
 */
export const sampleMovies: Omit<Movie, 'id'>[] = [
  {
    title: 'Inception',
    synopsis: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
    genre: ['Sci-Fi', 'Thriller'],
    language: 'English',
    duration: 148,
    release_date: '2010-07-16',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Ellen Page'],
    director: 'Christopher Nolan',
    poster_url: 'https://example.com/inception.jpg',
    trailer_url: 'https://youtube.com/watch?v=example',
    is_featured: true,
    is_trending: false
  },
  {
    title: 'The Matrix',
    synopsis: 'A computer hacker learns from mysterious rebels about the true nature of his reality.',
    genre: ['Action', 'Sci-Fi'],
    language: 'English',
    duration: 136,
    release_date: '1999-03-31',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    director: 'The Wachowskis',
    is_featured: false,
    is_trending: true
  },
  {
    title: 'Interstellar',
    synopsis: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    genre: ['Sci-Fi', 'Drama'],
    language: 'English',
    duration: 169,
    release_date: '2014-11-07',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    director: 'Christopher Nolan',
    is_featured: true,
    is_trending: true
  }
];

/**
 * Sample theater data
 */
export const sampleTheater: Omit<Theater, 'id'> = {
  name: 'Grand Cinema',
  location: '123 Main Street',
  city: 'San Francisco'
};

/**
 * Create sample screen data
 */
export function createSampleScreen(theaterId: string, name: string = 'Screen 1'): Omit<Screen, 'id'> {
  return {
    name,
    theater_id: theaterId,
    capacity: 80,
    seat_layout: generateSeatLayout(8, 10)
  };
}

/**
 * Create sample show data
 */
export function createSampleShow(
  movieId: string,
  screenId: string,
  daysFromNow: number = 2,
  time: string = '18:00'
): Omit<Show, 'id'> {
  const showDate = new Date();
  showDate.setDate(showDate.getDate() + daysFromNow);

  return {
    movie_id: movieId,
    screen_id: screenId,
    show_date: showDate.toISOString().split('T')[0],
    show_time: time
  };
}

/**
 * Admin user credentials for testing
 * Note: This should be created via backend seed script in real setup
 */
export const adminCredentials = {
  email: 'admin@example.com',
  password: 'AdminPass123!'
};
