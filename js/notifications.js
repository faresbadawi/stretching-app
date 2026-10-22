// Platzhalter für spätere Push-Benachrichtigungen (aktuell nicht eingebunden).
//
// Vorgesehener Ablauf:
//  1. In den Einstellungen einen Schalter „Erinnerungen“ ergänzen; Zustand in settings.reminders speichern.
//  2. Beim Einschalten: Notification.requestPermission() aufrufen (nur nach Nutzeraktion; iOS: nur installierte PWA, ab iOS 16.4).
//  3. Lokale Erinnerungen sind ohne Server nicht zuverlässig – für echte Pushes: registration.pushManager.subscribe({ ... })
//     und die Subscription an einen Push-Dienst senden (benötigt einen kleinen Server/Worker mit VAPID-Schlüsseln).
//  4. In sw.js die auskommentierten Handler 'push' und 'notificationclick' aktivieren.

export async function enableReminders() {
  throw new Error('Push-Benachrichtigungen sind noch nicht implementiert.');
}
