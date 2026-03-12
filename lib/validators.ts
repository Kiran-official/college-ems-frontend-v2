export function getPasswordStrength(pw: string): 'weak' | 'fair' | 'strong' {
    if (pw.length < 8) return 'weak'
    let score = 0
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (pw.length >= 12) score++
    if (score >= 4) return 'strong'
    if (score >= 2) return 'fair'
    return 'weak'
}
