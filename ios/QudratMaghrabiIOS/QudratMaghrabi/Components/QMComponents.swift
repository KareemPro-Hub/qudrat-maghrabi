import SwiftUI

struct CircleProgress: View {
    let progress: Double
    let symbol: String
    var tint: Color = QMTheme.violet

    var body: some View {
        ZStack {
            Circle()
                .stroke(tint.opacity(0.14), lineWidth: 3)

            Circle()
                .trim(from: 0, to: max(0.03, progress))
                .stroke(
                    AngularGradient(colors: [tint, QMTheme.magenta, tint], center: .center),
                    style: StrokeStyle(lineWidth: 3, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            Image(systemName: symbol)
                .font(.system(size: 28, weight: .medium))
                .symbolRenderingMode(.palette)
                .foregroundStyle(tint, QMTheme.pink.opacity(0.7))
        }
    }
}

struct LessonCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    let progress: Double
    var tint: Color = QMTheme.violet
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 17) {
                CircleProgress(progress: progress, symbol: symbol, tint: tint)
                    .frame(width: 73, height: 73)
                    .frame(maxWidth: .infinity, alignment: .center)

                VStack(alignment: .leading, spacing: 5) {
                    Text(title)
                        .font(QMTheme.font(.bold, size: 16))
                        .foregroundStyle(QMTheme.ink)
                        .lineLimit(1)

                    Text(subtitle)
                        .font(QMTheme.font(.regular, size: 11))
                        .foregroundStyle(QMTheme.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(18)
            .frame(maxWidth: .infinity, minHeight: 178)
            .qmGlass(cornerRadius: 25)
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

struct TopCircleButton: View {
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(QMTheme.ink)
                .frame(width: 42, height: 42)
                .background(.white.opacity(0.72), in: Circle())
                .overlay { Circle().stroke(.white.opacity(0.8)) }
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

struct CapsuleProgress: View {
    let progress: Double
    var tint: Color? = nil

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill((tint ?? QMTheme.violet).opacity(0.16))
                Capsule()
                    .fill(
                        tint.map(AnyShapeStyle.init)
                        ?? AnyShapeStyle(QMTheme.purpleGradient)
                    )
                    .frame(width: max(16, proxy.size.width * progress))
            }
        }
        .frame(height: 5)
    }
}

struct PrimaryGradientButton: View {
    let title: String
    var symbol: String? = "arrow.left"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Text(title)
                    .font(QMTheme.font(.bold, size: 16))
                if let symbol {
                    Image(systemName: symbol)
                        .font(.system(size: 14, weight: .bold))
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(QMTheme.purpleGradient, in: Capsule())
            .shadow(color: QMTheme.violet.opacity(0.28), radius: 20, y: 10)
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.965 : 1)
            .opacity(configuration.isPressed ? 0.88 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.72), value: configuration.isPressed)
    }
}

struct SectionTitle: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(QMTheme.font(.black, size: 20))
                .foregroundStyle(QMTheme.ink)
            Text(subtitle)
                .font(QMTheme.font(.regular, size: 11))
                .foregroundStyle(QMTheme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
