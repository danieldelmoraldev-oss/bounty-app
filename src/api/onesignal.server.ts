export async function sendPushNotification(targetMemberId: string, title: string, message: string) {
  const appId = "86c33f1d-ffe5-41bf-9d2c-73b265307954";
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey) {
    console.warn("Falta la API Key de OneSignal en el .env");
    return;
  }

  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: { external_id: [targetMemberId] },
        target_channel: "push",
        headings: { en: title, es: title },
        contents: { en: message, es: message },
      }),
    });
  } catch (error) {
    console.error("Error enviando notificación push:", error);
  }
}