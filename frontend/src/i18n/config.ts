import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      'nav.movies': 'Movies',
      'nav.bookings': 'My Bookings',
      'nav.profile': 'Profile',
      'nav.admin': 'Admin',
      'nav.logout': 'Logout',
      'nav.login': 'Login',
      'auth.login': 'Login',
      'auth.register': 'Register',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.fullName': 'Full Name',
      'auth.phone': 'Phone',
      'movies.search': 'Search movies...',
      'movies.filter': 'Filter',
      'movies.featured': 'Featured Movies',
      'movies.trending': 'Trending Now',
      'booking.selectSeats': 'Select Seats',
      'booking.available': 'Available',
      'booking.booked': 'Booked',
      'booking.selected': 'Selected',
      'booking.confirm': 'Confirm Booking',
      'booking.total': 'Total',
      'settings.theme': 'Theme',
      'settings.language': 'Language',
      'settings.darkMode': 'Dark Mode',
      'settings.lightMode': 'Light Mode'
    }
  },
  es: {
    translation: {
      'nav.movies': 'Películas',
      'nav.bookings': 'Mis Reservas',
      'nav.profile': 'Perfil',
      'nav.admin': 'Admin',
      'nav.logout': 'Cerrar Sesión',
      'nav.login': 'Iniciar Sesión',
      'auth.login': 'Iniciar Sesión',
      'auth.register': 'Registrarse',
      'auth.email': 'Correo Electrónico',
      'auth.password': 'Contraseña',
      'auth.fullName': 'Nombre Completo',
      'auth.phone': 'Teléfono',
      'movies.search': 'Buscar películas...',
      'movies.filter': 'Filtrar',
      'movies.featured': 'Películas Destacadas',
      'movies.trending': 'Tendencias',
      'booking.selectSeats': 'Seleccionar Asientos',
      'booking.available': 'Disponible',
      'booking.booked': 'Reservado',
      'booking.selected': 'Seleccionado',
      'booking.confirm': 'Confirmar Reserva',
      'booking.total': 'Total',
      'settings.theme': 'Tema',
      'settings.language': 'Idioma',
      'settings.darkMode': 'Modo Oscuro',
      'settings.lightMode': 'Modo Claro'
    }
  },
  fr: {
    translation: {
      'nav.movies': 'Films',
      'nav.bookings': 'Mes Réservations',
      'nav.profile': 'Profil',
      'nav.admin': 'Admin',
      'nav.logout': 'Déconnexion',
      'nav.login': 'Connexion',
      'auth.login': 'Connexion',
      'auth.register': "S'inscrire",
      'auth.email': 'Email',
      'auth.password': 'Mot de passe',
      'auth.fullName': 'Nom Complet',
      'auth.phone': 'Téléphone',
      'movies.search': 'Rechercher des films...',
      'movies.filter': 'Filtrer',
      'movies.featured': 'Films en vedette',
      'movies.trending': 'Tendances',
      'booking.selectSeats': 'Sélectionner des sièges',
      'booking.available': 'Disponible',
      'booking.booked': 'Réservé',
      'booking.selected': 'Sélectionné',
      'booking.confirm': 'Confirmer la réservation',
      'booking.total': 'Total',
      'settings.theme': 'Thème',
      'settings.language': 'Langue',
      'settings.darkMode': 'Mode Sombre',
      'settings.lightMode': 'Mode Clair'
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
