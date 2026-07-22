import SwiftUI

enum QMFontWeight {
    case light
    case regular
    case bold
    case black

    var name: String {
        switch self {
        case .light: "FrutigerLTArabic-45Light"
        case .regular: "FrutigerLTArabic-55Roman"
        case .bold: "FrutigerLTArabic-65Bold"
        case .black: "FrutigerLTArabic-75Black"
        }
    }
}

enum QMTheme {
    static let violet = Color(hex: 0x7D35E8)
    static let violetDeep = Color(hex: 0x5A22C9)
    static let magenta = Color(hex: 0xD743C5)
    static let pink = Color(hex: 0xF45C9C)
    static let gold = Color(hex: 0xFFC83D)
    static let coral = Color(hex: 0xFF8B75)
    static let ink = Color(hex: 0x24123F)
    static let muted = Color(hex: 0x81788F)
    static let canvas = Color(hex: 0xF6F7FF)
    static let softViolet = Color(hex: 0xEEE8FF)
    static let success = Color(hex: 0x38C8A1)
    static let shadow = Color(hex: 0x4A2B79).opacity(0.14)

    static let brandGradient = LinearGradient(
        colors: [violetDeep, violet, magenta, coral],
        startPoint: .topTrailing,
        endPoint: .bottomLeading
    )

    static let purpleGradient = LinearGradient(
        colors: [Color(hex: 0x6C2DE0), Color(hex: 0x9B42ED)],
        startPoint: .topTrailing,
        endPoint: .bottomLeading
    )

    static func font(_ weight: QMFontWeight, size: CGFloat) -> Font {
        .custom(weight.name, size: size)
    }
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

extension View {
    func qmGlass(
        cornerRadius: CGFloat = 25,
        tint: Color? = nil,
        interactive: Bool = false
    ) -> some View {
        modifier(
            QMLiquidGlassModifier(
                cornerRadius: cornerRadius,
                tint: tint,
                interactive: interactive
            )
        )
    }
}

private struct QMLiquidGlassModifier: ViewModifier {
    let cornerRadius: CGFloat
    let tint: Color?
    let interactive: Bool

    @ViewBuilder
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .background(
                    .white.opacity(0.06),
                    in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                )
                .glassEffect(
                    .regular
                        .tint(tint ?? .white.opacity(0.14))
                        .interactive(interactive),
                    in: .rect(cornerRadius: cornerRadius)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [.white.opacity(0.72), .white.opacity(0.16)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.8
                        )
                }
                .shadow(color: QMTheme.shadow, radius: 24, y: 12)
        } else {
            content
                .background(
                    .ultraThinMaterial,
                    in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                )
                .background(
                    tint?.opacity(0.12) ?? .clear,
                    in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [.white.opacity(0.96), .white.opacity(0.42)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                }
                .shadow(color: QMTheme.shadow, radius: 20, y: 10)
        }
    }
}

struct QMGlassGroup<Content: View>: View {
    let spacing: CGFloat
    let content: Content

    init(spacing: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    @ViewBuilder
    var body: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: spacing) {
                content
            }
        } else {
            content
        }
    }
}

struct AmbientBackdrop: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [QMTheme.canvas, QMTheme.softViolet.opacity(0.72), Color.white],
                startPoint: .topTrailing,
                endPoint: .bottomLeading
            )

            Circle()
                .fill(QMTheme.violet.opacity(0.36))
                .frame(width: 360, height: 360)
                .blur(radius: 82)
                .offset(x: 150, y: -340)

            Circle()
                .fill(QMTheme.magenta.opacity(0.25))
                .frame(width: 300, height: 300)
                .blur(radius: 82)
                .offset(x: -170, y: -210)

            Circle()
                .fill(QMTheme.gold.opacity(0.14))
                .frame(width: 230, height: 230)
                .blur(radius: 70)
                .offset(x: -170, y: 390)
        }
        .ignoresSafeArea()
    }
}
