import Foundation

struct AppConfiguration: Sendable {
    let supabaseURL: URL
    let supabasePublishableKey: String
    let apiBaseURL: URL

    static let live: AppConfiguration = {
        func value(_ key: String) -> String {
            guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
                  !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  !value.contains("$(")
            else {
                fatalError("Missing required iOS configuration: \(key)")
            }
            return value
        }

        guard let supabaseURL = URL(string: value("SUPABASE_URL")),
              let apiBaseURL = URL(string: value("API_BASE_URL"))
        else {
            fatalError("Invalid iOS service URL configuration")
        }

        return AppConfiguration(
            supabaseURL: supabaseURL,
            supabasePublishableKey: value("SUPABASE_PUBLISHABLE_KEY"),
            apiBaseURL: apiBaseURL
        )
    }()
}
