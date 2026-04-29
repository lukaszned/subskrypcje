import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserSettings, updateUserSettings } from '../api/dashboard';
import { UserSettings } from '../types/api';

export const useUserSettings = () => {
  return useQuery({
    queryKey: ['user', 'settings'],
    queryFn: getUserSettings,
    staleTime: 300000, // Ustawienia rzadko się zmieniają, 5 minut cache
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<UserSettings>) => updateUserSettings(payload),
    onSuccess: (updatedSettings) => {
      // Aktualizujemy cache ustawień
      queryClient.setQueryData(['user', 'settings'], updatedSettings);
      
      // Bardzo ważne: Gdy zmienia się waluta bazowa, musimy odświeżyć cały dashboard!
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
