// Hachage de mot de passe (démo). En production : bcrypt/argon2 côté serveur.
export function hashPassword(pw: string): string {
  let h = 5381
  for (let i = 0; i < pw.length; i++) h = (h * 33) ^ pw.charCodeAt(i)
  return `h${(h >>> 0).toString(36)}`
}
