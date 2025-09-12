const messages = {
  en: {
    device: {
      missingFields: "Missing required fields for device.",
      typeInvalid: "Invalid device type.",
      alreadyExists: "Device already exists.",
      created: "Device created successfully.",
      updated: "Device updated successfully.",
      deleted: "Device deleted successfully.",
      notFound: "Device not found.",
      offline: "Device is offline.",
      markedOnline: "Device marked as online."
    },
    automation: {
      missingFields: "Missing required fields for automation.",
      created: "Automation created successfully.",
      updated: "Automation updated successfully.",
      deleted: "Automation deleted successfully.",
      notFound: "Automation not found."
    },
        api: {
      missingKey: "API key required.",
      invalidKey: "Invalid API key.",
      serverError: "Error validating API key.",
      missingUserId: "User ID required."   // ✅ Add this
    },

    ota: {
      updateAvailable: "OTA update available.",
      updateCompleted: "OTA update completed.",
      updateFailed: "OTA update failed.",
      updateNotFound: "OTA update not found."
    },
    camera: {
      snapshotFailed: "Failed to capture snapshot.",
      offline: "Camera is offline.",
      motionDetected: "Motion detected."
    },
    analytics: {
      fetchFailed: "Failed to fetch analytics data."
    },
    auth: {
      noToken: "No token provided.",
      invalidToken: "Invalid token.",
      accessDenied: "Access denied.",
      invalidCredentials: "Invalid credentials.",
      loginSuccess: "Login successful."
    },
    reset: {
      requested: "You requested a password reset.",
      clickHere: "Click here to reset your password.",
      expiry: "This link expires in 15 minutes.",
      notFound: "No user found with that email.",
      sent: "Reset link sent to your email.",
      success: "Password reset successful.",
      invalidToken: "Invalid or expired token."
    },
    api: {
      missingKey: "API key required.",
      invalidKey: "Invalid API key.",
      serverError: "Error validating API key."
    }
  },
  fr: {
    device: {
      missingFields: "Champs obligatoires manquants pour l'appareil.",
      typeInvalid: "Type d'appareil invalide.",
      alreadyExists: "L'appareil existe déjà.",
      created: "Appareil créé avec succès.",
      updated: "Appareil mis à jour avec succès.",
      deleted: "Appareil supprimé avec succès.",
      notFound: "Appareil introuvable.",
      offline: "Appareil hors ligne.",
      markedOnline: "Appareil marqué comme en ligne."
    },
    automation: {
      missingFields: "Champs obligatoires manquants pour l'automatisation.",
      created: "Automatisation créée avec succès.",
      updated: "Automatisation mise à jour avec succès.",
      deleted: "Automatisation supprimée avec succès.",
      notFound: "Automatisation introuvable."
    },
            api: {
      missingKey: "Clé API requise.",
      invalidKey: "Clé API invalide.",
      serverError: "Erreur lors de la validation de la clé API.",
      missingUserId: "Identifiant utilisateur requis."  // ✅ Add this
    },
    ota: {
      updateAvailable: "Mise à jour OTA disponible.",
      updateCompleted: "Mise à jour OTA terminée.",
      updateFailed: "Échec de la mise à jour OTA.",
      updateNotFound: "Mise à jour OTA introuvable."
    },
    camera: {
      snapshotFailed: "Échec de la capture de l'instantané.",
      offline: "Caméra hors ligne.",
      motionDetected: "Mouvement détecté."
    },
    analytics: {
      fetchFailed: "Échec du chargement des données d'analyse."
    },
    auth: {
      noToken: "Aucun jeton fourni.",
      invalidToken: "Jeton invalide.",
      accessDenied: "Accès refusé.",
      invalidCredentials: "Identifiants invalides.",
      loginSuccess: "Connexion réussie."
    },
    reset: {
      requested: "Vous avez demandé une réinitialisation du mot de passe.",
      clickHere: "Cliquez ici pour réinitialiser votre mot de passe.",
      expiry: "Ce lien expire dans 15 minutes.",
      notFound: "Aucun utilisateur trouvé avec cet e-mail.",
      sent: "Lien de réinitialisation envoyé à votre e-mail.",
      success: "Réinitialisation du mot de passe réussie.",
      invalidToken: "Lien invalide ou expiré."
    },
    api: {
      missingKey: "Clé API requise.",
      invalidKey: "Clé API invalide.",
      serverError: "Erreur lors de la validation de la clé API."
    }
  }
};

export function getMessage(lang = "en", key, ...args) {
  const parts = key.split(".");
  const message =
    parts.reduce((obj, part) => obj && obj[part], messages[lang]) ||
    parts.reduce((obj, part) => obj && obj[part], messages.en);

  if (typeof message === "function") return message(...args);
  return message || key;
}

// Default export (optional)
export default getMessage;
