/// User-facing copy (Spanish). Kept in one place so l10n can replace it later.
abstract final class AppStrings {
  static const appName = 'Goshopping';
  static const tagline = 'Tu compra, a tu manera';

  // Shared
  static const emailLabel = 'Correo electrónico';
  static const passwordLabel = 'Contraseña';
  static const newPasswordLabel = 'Nueva contraseña';
  static const nameLabel = 'Nombre (opcional)';
  static const codeLabel = 'Código de verificación';
  static const showPassword = 'Mostrar contraseña';
  static const hidePassword = 'Ocultar contraseña';
  static const retry = 'Reintentar';
  static const loading = 'Cargando';

  // Validation
  static const emailInvalid = 'Ingresa un correo válido';
  static const passwordRequired = 'Ingresa tu contraseña';
  static const ruleMinLength = 'Al menos 8 caracteres';
  static const ruleUppercase = 'Una letra mayúscula';
  static const ruleLowercase = 'Una letra minúscula';
  static const ruleNumber = 'Un número';
  static const ruleMet = 'cumplida';
  static const rulePending = 'pendiente';

  // Sign in
  static const signInTitle = 'Iniciar sesión';
  static const signInButton = 'Iniciar sesión';
  static const continueWithGoogle = 'Continuar con Google';
  static const continueWithApple = 'Continuar con Apple';
  static const continueWithFacebook = 'Continuar con Facebook';
  static const orDivider = 'o';
  static const forgotPasswordLink = '¿Olvidaste tu contraseña?';
  static const createAccountLink = 'Crear cuenta';
  static const confirmAccountAction = 'Confirmar cuenta';

  // Sign up
  static const signUpTitle = 'Crear cuenta';
  static const signUpButton = 'Registrarme';
  static const passwordRulesTitle = 'Tu contraseña debe tener:';

  // Confirm code
  static const confirmTitle = 'Confirma tu correo';
  static const confirmButton = 'Confirmar';
  static const resendCode = 'Reenviar código';
  static const codeResentNotice = 'Te enviamos un nuevo código';
  static const accountConfirmedNotice =
      'Cuenta confirmada. Ya puedes iniciar sesión.';
  static String confirmInstructions(String email) =>
      'Enviamos un código de 6 dígitos a $email.';

  // Forgot / reset password
  static const forgotTitle = 'Recuperar contraseña';
  static const forgotInstructions =
      'Ingresa tu correo y te enviaremos un código para crear una nueva '
      'contraseña.';
  static const sendCodeButton = 'Enviar código';
  static const resetTitle = 'Restablecer contraseña';
  static const resetButton = 'Cambiar contraseña';
  static const passwordResetNotice =
      'Contraseña actualizada. Ya puedes iniciar sesión.';
  static String resetInstructions(String email) =>
      'Ingresa el código que enviamos a $email y tu nueva contraseña.';

  // Home
  static const homeTitle = 'Inicio';
  static const signOut = 'Cerrar sesión';
  static const signOutPartialNotice =
      'Cerraste sesión en este dispositivo, pero no pudimos cerrarla en el '
      'servidor.';
  static const signOutFailedNotice =
      'No pudimos cerrar tu sesión por completo. Inténtalo de nuevo más tarde.';
  static const profileLoadError = 'No pudimos cargar tu perfil.';
  static const profileProviderLabel = 'Método de acceso';

  // Session restore
  static const sessionRestoreError =
      'No pudimos recuperar tu sesión. Revisa tu conexión e inténtalo de '
      'nuevo.';

  // Not configured
  static const notConfiguredTitle = 'Autenticación no configurada';
  static const notConfiguredBody =
      'Faltan los datos de Amazon Cognito. Compila la app con los valores '
      'COGNITO_* mediante --dart-define (ver README de apps/mobile).';

  // Failures
  static const errorInvalidCredentials = 'Correo o contraseña incorrectos.';
  static const errorUserNotConfirmed =
      'Tu cuenta aún no está confirmada. Revisa tu correo.';
  static const errorSocialNotConfirmed =
      'No pudimos completar el acceso con ese método. Inténtalo de nuevo o '
      'usa tu correo y contraseña.';
  static const errorUserExists = 'Ya existe una cuenta con ese correo.';
  static const errorCodeMismatch = 'El código no es correcto.';
  static const errorCodeExpired = 'El código venció. Solicita uno nuevo.';
  static const errorWeakPassword =
      'La contraseña no cumple los requisitos de seguridad.';
  static const errorTooManyRequests =
      'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  static const errorNetwork = 'Sin conexión. Revisa tu internet.';
  static const errorCancelled = 'Inicio de sesión cancelado.';
  static const errorUnknown = 'Algo salió mal. Inténtalo de nuevo.';
}
