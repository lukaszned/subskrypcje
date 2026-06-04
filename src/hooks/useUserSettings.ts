import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserSettings, UpdateUserSettingsPayload, updateUserSettings } from '../api/dashboard';
import { cancelSubscriptionReminders, requestNotificationPermissions } from '../utils/notifications';

export const useUserSettings = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['user', 'settings'],
    queryFn: getUserSettings,
    staleTime: 300000, // Ustawienia rzadko się zmieniają, 5 minut cache
    enabled,
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserSettingsPayload) => updateUserSettings(payload),
    onSuccess: (updatedSettings) => {
      // Aktualizujemy cache ustawień
      queryClient.setQueryData(['user', 'settings'], updatedSettings);
      
      // Bardzo ważne: Gdy zmienia się waluta bazowa, musimy odświeżyć cały dashboard!
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (updatedSettings.notificationsEnabled === false) {
        cancelSubscriptionReminders();
      } else {
        requestNotificationPermissions();
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'reminders'] });
      }
    },
  });
};
