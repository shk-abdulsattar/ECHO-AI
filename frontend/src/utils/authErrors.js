/** Map Firebase Auth error codes to short user-facing copy */
export function mapAuthError(err) {
    const code = err?.code || '';
    const map = {
        'auth/invalid-email': 'That email address doesn’t look valid.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with that email.',
        'auth/wrong-password': 'Incorrect password. Try again or use Forgot.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/email-already-in-use': 'That email is already registered. Try logging in.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
        'auth/operation-not-allowed': 'Email/password sign-in isn’t enabled for this project.',
    };
    return map[code] || err?.message || 'Something went wrong. Please try again.';
}
