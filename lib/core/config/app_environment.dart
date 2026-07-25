abstract final class AppEnvironment {
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
  );
  static const String platformBaseUrl = String.fromEnvironment(
    'PLATFORM_BASE_URL',
    defaultValue: 'https://www.qudratmaghrabi.com',
  );

  static bool get isSupabaseConfigured =>
      supabaseUrl.isNotEmpty && supabasePublishableKey.isNotEmpty;

  static void validate() {
    if (!isSupabaseConfigured) {
      throw StateError(
        'Supabase configuration is missing. '
        'Run with --dart-define-from-file=config/supabase.dev.json',
      );
    }
  }
}
