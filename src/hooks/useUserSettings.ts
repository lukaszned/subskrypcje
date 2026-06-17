import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserSettings, UpdateUserSettingsPayload, updateUserSettings } from '../api/dashboard';
import { cancelSubscriptionReminders, requestNotificationPermissions } from '../utils/notifications';

const USER_SETTINGS_QUERY_KEY = ['user', 'settings'] as const;
const SETTINGS_BACKGROUND_RETRY_MS = 8000;

export const useUserSettings = (enabled: boolean = true) => {
  return useQuery({
    queryKey: USER_SETTINGS_QUERY_KEY,
    queryFn: getUserSettings,
    staleTime: 300000,
    enabled,
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserSettingsPayload) => updateUserSettings(payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(USER_SETTINGS_QUERY_KEY, updatedSettings);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (updatedSettings.notificationsEnabled === false) {
        cancelSubscriptionReminders();
      } else {
        requestNotificationPermissions();
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'reminders'] });
      }

      if (updatedSettings.__localOnly) {
        setTimeout(() => {
          void queryClient.refetchQueries({
            queryKey: USER_SETTINGS_QUERY_KEY,
            type: 'active',
          });
        }, SETTINGS_BACKGROUND_RETRY_MS);
      }
    },
  });
};
