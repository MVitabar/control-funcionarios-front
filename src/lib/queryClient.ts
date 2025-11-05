import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo de caché por defecto: 5 minutos
      staleTime: 5 * 60 * 1000,
      // No reintentar automáticamente en caso de error
      retry: false,
      // No recargar la ventana cuando se vuelve a enfocar
      refetchOnWindowFocus: false,
    },
  },
});
