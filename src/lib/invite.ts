// Invitations via WhatsApp (lien wa.me avec message pré-rempli).

function appUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin + window.location.pathname
  return 'https://racines.app'
}

/** Message d'invitation, avec indice de lien de parenté si fourni. */
export function inviteMessage(familyName: string, byName: string, relationHint?: string): string {
  const lines = [
    `🌳 ${byName} t'invite à rejoindre l'arbre de la famille ${familyName} sur RACINES.`,
    relationHint ? `Tu y serais ajouté·e comme : ${relationHint}.` : '',
    `Rejoins-nous pour qu'on reconstruise notre histoire ensemble : ${appUrl()}`,
  ]
  return lines.filter(Boolean).join('\n')
}

/** URL wa.me : si un numéro est fourni → discussion directe, sinon sélecteur. */
export function whatsappLink(message: string, phone?: string): string {
  const num = phone ? phone.replace(/\D/g, '') : ''
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}
