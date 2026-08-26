import { LocalNotifications } from '@capacitor/local-notifications';

export const initNativeNotifications = async () => {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {}
};

export const triggerNativeNotification = async (title: string, body: string) => {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 100) },
          sound: undefined,
          actionTypeId: '',
          extra: null,
        },
      ],
    });
  } catch (e) {}
};
