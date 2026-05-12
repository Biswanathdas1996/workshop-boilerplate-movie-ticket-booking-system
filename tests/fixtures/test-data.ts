export const TEST_USERS = {
  regularUser: {
    email: `testuser_${Date.now()}@example.com`,
    password: 'Test123!',
    fullName: 'John Doe',
  },
  adminUser: {
    email: `admin_${Date.now()}@example.com`,
    password: 'Admin123!',
    fullName: 'Admin User',
  },
  anotherUser: {
    email: `user2_${Date.now()}@example.com`,
    password: 'User2123!',
    fullName: 'Jane Smith',
  },
};

export const TEST_PAYMENT = {
  cardNumber: '1234 5678 9012 3456',
  cardHolder: 'John Doe',
  paymentMethod: 'card',
};

export const INVALID_CREDENTIALS = {
  email: 'invalid@example.com',
  password: 'WrongPassword123',
};

export const MOVIE_SEARCH_TERMS = {
  action: 'Action',
  thriller: 'Thriller',
  nonExistent: 'NonExistentMovie12345',
};

export const MOVIE_FILTERS = {
  genres: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller'],
  languages: ['English', 'Hindi', 'Tamil', 'Telugu'],
};

export const BOOKING_CONFIG = {
  defaultSeatsToSelect: 3,
  pricePerSeat: 15,
};
