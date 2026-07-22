import SwiftUI
import UIKit

struct AuthView: View {
    enum Mode: String, CaseIterable, Identifiable {
        case login = "تسجيل الدخول"
        case signup = "حساب جديد"
        var id: String { rawValue }
    }

    enum AuthSheet: Identifiable {
        case resetPassword
        var id: Int { 1 }
    }

    @Environment(AppSession.self) private var session
    @State private var mode: Mode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var fullName = ""
    @State private var phone = ""
    @State private var role: UserRole = .student
    @State private var agreesToTerms = false
    @State private var revealsPassword = false
    @State private var isWorking = false
    @State private var message: AuthMessage?
    @State private var sheet: AuthSheet?

    var body: some View {
        ZStack {
            AmbientBackdrop()

            ScrollView {
                VStack(spacing: 22) {
                    brandHeader
                    modePicker

                    Group {
                        if mode == .login {
                            loginForm
                                .transition(.move(edge: .trailing).combined(with: .opacity))
                        } else {
                            signupForm
                                .transition(.move(edge: .leading).combined(with: .opacity))
                        }
                    }
                    .animation(.spring(response: 0.42, dampingFraction: 0.84), value: mode)

                    securityNote
                }
                .padding(.horizontal, 20)
                .padding(.top, 28)
                .padding(.bottom, 36)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .sheet(item: $sheet) { destination in
            switch destination {
            case .resetPassword:
                PasswordResetSheet(initialEmail: email)
            }
        }
        .alert(item: $message) { message in
            Alert(
                title: Text(message.title),
                message: Text(message.body),
                dismissButton: .default(Text("حسنًا"))
            )
        }
    }

    private var brandHeader: some View {
        VStack(spacing: 12) {
            Image("BrandLogo")
                .resizable()
                .scaledToFit()
                .padding(14)
                .frame(width: 104, height: 104)
                .qmGlass(cornerRadius: 30, tint: .white.opacity(0.16))

            VStack(spacing: 5) {
                Text(mode == .login ? "أهلًا بعودتك" : "ابدأ رحلة التفوّق")
                    .font(QMTheme.font(.black, size: 29))
                    .foregroundStyle(QMTheme.ink)

                Text(mode == .login ? "سجّل دخولك وكمّل من حيث توقفت" : "حساب واحد يجمع دروسك وتقدمك واختباراتك")
                    .font(QMTheme.font(.regular, size: 13))
                    .foregroundStyle(QMTheme.muted)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private var modePicker: some View {
        HStack(spacing: 6) {
            ForEach(Mode.allCases) { item in
                Button {
                    withAnimation {
                        mode = item
                        message = nil
                    }
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: item == .login ? "arrow.right.to.line.compact" : "person.badge.plus")
                        Text(item.rawValue)
                    }
                    .font(QMTheme.font(.bold, size: 13))
                    .foregroundStyle(mode == item ? .white : QMTheme.muted)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background {
                        if mode == item {
                            Capsule()
                                .fill(QMTheme.purpleGradient)
                                .matchedGeometryEffect(id: "authMode", in: modeNamespace)
                                .shadow(color: QMTheme.violet.opacity(0.24), radius: 14, y: 7)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(5)
        .qmGlass(cornerRadius: 28)
    }

    private var loginForm: some View {
        VStack(spacing: 15) {
            AuthField(
                title: "البريد الإلكتروني",
                placeholder: "name@example.com",
                symbol: "envelope.fill",
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )

            PasswordField(
                title: "كلمة المرور",
                placeholder: "أدخل كلمة المرور",
                text: $password,
                revealsPassword: $revealsPassword
            )

            Button("نسيت كلمة المرور؟") {
                sheet = .resetPassword
            }
            .font(QMTheme.font(.bold, size: 12))
            .foregroundStyle(QMTheme.violet)
            .frame(maxWidth: .infinity, alignment: .leading)

            PrimaryAuthButton(
                title: isWorking ? "جاري تسجيل الدخول..." : "تسجيل الدخول",
                symbol: "arrow.left",
                isWorking: isWorking,
                action: signIn
            )
        }
        .padding(20)
        .qmGlass(cornerRadius: 30, tint: QMTheme.violet.opacity(0.03))
    }

    private var signupForm: some View {
        VStack(spacing: 15) {
            rolePicker

            AuthField(
                title: "الاسم الكامل",
                placeholder: "اكتب اسمك كما تحب أن يظهر",
                symbol: "person.fill",
                text: $fullName,
                contentType: .name
            )
            AuthField(
                title: "البريد الإلكتروني",
                placeholder: "name@example.com",
                symbol: "envelope.fill",
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
            AuthField(
                title: "رقم الجوال (اختياري)",
                placeholder: "05xxxxxxxx",
                symbol: "phone.fill",
                text: $phone,
                contentType: .telephoneNumber,
                keyboardType: .phonePad
            )
            PasswordField(
                title: "كلمة المرور",
                placeholder: "8 أحرف على الأقل",
                text: $password,
                revealsPassword: $revealsPassword
            )
            PasswordField(
                title: "تأكيد كلمة المرور",
                placeholder: "أعد كتابة كلمة المرور",
                text: $confirmPassword,
                revealsPassword: .constant(false)
            )

            Button {
                agreesToTerms.toggle()
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: agreesToTerms ? "checkmark.square.fill" : "square")
                        .font(.system(size: 21, weight: .semibold))
                        .foregroundStyle(agreesToTerms ? QMTheme.violet : QMTheme.muted)
                    Text("أوافق على الشروط وسياسة الخصوصية")
                        .font(QMTheme.font(.regular, size: 12))
                        .foregroundStyle(QMTheme.muted)
                    Spacer()
                }
            }
            .buttonStyle(.plain)

            PrimaryAuthButton(
                title: isWorking ? "جاري إنشاء الحساب..." : "إنشاء الحساب",
                symbol: "sparkles",
                isWorking: isWorking,
                action: signUp
            )
        }
        .padding(20)
        .qmGlass(cornerRadius: 30, tint: QMTheme.magenta.opacity(0.03))
    }

    private var rolePicker: some View {
        HStack(spacing: 10) {
            roleButton(.student, symbol: "graduationcap.fill")
            roleButton(.parent, symbol: "figure.2.and.child.holdinghands")
        }
    }

    private func roleButton(_ item: UserRole, symbol: String) -> some View {
        Button {
            role = item
        } label: {
            HStack(spacing: 7) {
                Image(systemName: symbol)
                Text(item.arabicTitle)
            }
            .font(QMTheme.font(.bold, size: 12))
            .foregroundStyle(role == item ? QMTheme.violet : QMTheme.muted)
            .frame(maxWidth: .infinity)
            .frame(height: 46)
            .background(
                role == item ? QMTheme.softViolet : Color.white.opacity(0.46),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(role == item ? QMTheme.violet.opacity(0.45) : .white, lineWidth: 1)
            }
        }
        .buttonStyle(ScaleButtonStyle())
    }

    private var securityNote: some View {
        HStack(spacing: 8) {
            Image(systemName: "lock.shield.fill")
                .foregroundStyle(QMTheme.success)
            Text("بياناتك مشفّرة ولا نحتفظ بكلمة مرورك داخل التطبيق")
                .font(QMTheme.font(.regular, size: 11))
                .foregroundStyle(QMTheme.muted)
        }
    }

    private func signIn() {
        guard email.contains("@"), !password.isEmpty else {
            message = .error("أدخل البريد الإلكتروني وكلمة المرور.")
            return
        }
        isWorking = true
        Task {
            defer { isWorking = false }
            do {
                try await session.signIn(email: email, password: password)
            } catch {
                message = .error(localizedAuthError(error))
            }
        }
    }

    private func signUp() {
        let cleanName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard cleanName.count >= 2 else {
            message = .error("اكتب الاسم الكامل بشكل صحيح.")
            return
        }
        guard email.contains("@") else {
            message = .error("اكتب بريدًا إلكترونيًا صحيحًا.")
            return
        }
        guard password.count >= 8 else {
            message = .error("كلمة المرور يجب ألا تقل عن 8 أحرف.")
            return
        }
        guard password == confirmPassword else {
            message = .error("كلمتا المرور غير متطابقتين.")
            return
        }
        guard agreesToTerms else {
            message = .error("وافق على الشروط وسياسة الخصوصية للمتابعة.")
            return
        }

        isWorking = true
        Task {
            defer { isWorking = false }
            do {
                let needsConfirmation = try await session.signUp(
                    fullName: cleanName,
                    email: email,
                    phone: phone,
                    password: password,
                    role: role
                )
                if needsConfirmation {
                    mode = .login
                    message = AuthMessage(
                        title: "تحقق من بريدك",
                        body: "أرسلنا رابط تأكيد إلى بريدك الإلكتروني. بعد التأكيد ارجع وسجّل الدخول."
                    )
                }
            } catch {
                message = .error(localizedAuthError(error))
            }
        }
    }

    @Namespace private var modeNamespace
}

private struct AuthField: View {
    let title: String
    let placeholder: String
    let symbol: String
    @Binding var text: String
    var contentType: UITextContentType? = nil
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .trailing, spacing: 7) {
            Text(title)
                .font(QMTheme.font(.bold, size: 12))
                .foregroundStyle(QMTheme.ink)

            HStack(spacing: 11) {
                Image(systemName: symbol)
                    .foregroundStyle(QMTheme.violet)
                    .frame(width: 20)

                TextField(placeholder, text: $text)
                    .font(QMTheme.font(.regular, size: 14))
                    .textContentType(contentType)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .multilineTextAlignment(.trailing)
            }
            .padding(.horizontal, 15)
            .frame(height: 54)
            .background(.white.opacity(0.74), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(QMTheme.violet.opacity(0.13))
            }
        }
    }
}

private struct PasswordField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    @Binding var revealsPassword: Bool

    var body: some View {
        VStack(alignment: .trailing, spacing: 7) {
            Text(title)
                .font(QMTheme.font(.bold, size: 12))
                .foregroundStyle(QMTheme.ink)

            HStack(spacing: 11) {
                Image(systemName: "lock.fill")
                    .foregroundStyle(QMTheme.violet)
                    .frame(width: 20)

                Group {
                    if revealsPassword {
                        TextField(placeholder, text: $text)
                    } else {
                        SecureField(placeholder, text: $text)
                    }
                }
                .font(QMTheme.font(.regular, size: 14))
                .textContentType(.password)
                .multilineTextAlignment(.trailing)

                Button {
                    revealsPassword.toggle()
                } label: {
                    Image(systemName: revealsPassword ? "eye.slash.fill" : "eye.fill")
                        .foregroundStyle(QMTheme.muted)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 15)
            .frame(height: 54)
            .background(.white.opacity(0.74), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(QMTheme.violet.opacity(0.13))
            }
        }
    }
}

private struct PrimaryAuthButton: View {
    let title: String
    let symbol: String
    let isWorking: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isWorking {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: symbol)
                }
                Text(title)
            }
            .font(QMTheme.font(.bold, size: 16))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(QMTheme.purpleGradient, in: Capsule())
            .shadow(color: QMTheme.violet.opacity(0.28), radius: 20, y: 10)
        }
        .buttonStyle(ScaleButtonStyle())
        .disabled(isWorking)
        .opacity(isWorking ? 0.76 : 1)
    }
}

private struct PasswordResetSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session
    @State private var email: String
    @State private var isWorking = false
    @State private var sent = false
    @State private var errorMessage: String?

    init(initialEmail: String) {
        _email = State(initialValue: initialEmail)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackdrop()
                VStack(spacing: 18) {
                    Image(systemName: sent ? "checkmark.seal.fill" : "key.fill")
                        .font(.system(size: 34, weight: .semibold))
                        .foregroundStyle(sent ? QMTheme.success : QMTheme.violet)
                        .frame(width: 74, height: 74)
                        .qmGlass(cornerRadius: 24)

                    Text(sent ? "تم إرسال الرابط" : "استعادة كلمة المرور")
                        .font(QMTheme.font(.black, size: 24))
                        .foregroundStyle(QMTheme.ink)

                    Text(sent ? "راجع بريدك واتبع الخطوات لتعيين كلمة مرور جديدة." : "أدخل بريدك وسنرسل لك رابطًا آمنًا لإعادة التعيين.")
                        .font(QMTheme.font(.regular, size: 13))
                        .foregroundStyle(QMTheme.muted)
                        .multilineTextAlignment(.center)

                    if !sent {
                        AuthField(
                            title: "البريد الإلكتروني",
                            placeholder: "name@example.com",
                            symbol: "envelope.fill",
                            text: $email,
                            contentType: .emailAddress,
                            keyboardType: .emailAddress
                        )
                        PrimaryAuthButton(
                            title: isWorking ? "جاري الإرسال..." : "إرسال رابط الاستعادة",
                            symbol: "paperplane.fill",
                            isWorking: isWorking
                        ) {
                            guard email.contains("@") else {
                                errorMessage = "اكتب بريدًا إلكترونيًا صحيحًا."
                                return
                            }
                            isWorking = true
                            Task {
                                defer { isWorking = false }
                                do {
                                    try await session.sendPasswordReset(email: email)
                                    sent = true
                                } catch {
                                    errorMessage = localizedAuthError(error)
                                }
                            }
                        }
                    } else {
                        Button("العودة لتسجيل الدخول") { dismiss() }
                            .buttonStyle(.borderedProminent)
                            .tint(QMTheme.violet)
                    }
                }
                .padding(24)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .alert(
                "تعذّر الإرسال",
                isPresented: Binding(
                    get: { errorMessage != nil },
                    set: { if !$0 { errorMessage = nil } }
                )
            ) {
                Button("حسنًا", role: .cancel) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
        .presentationDetents([.medium, .large])
    }
}

private struct AuthMessage: Identifiable {
    let id = UUID()
    let title: String
    let body: String

    static func error(_ body: String) -> AuthMessage {
        AuthMessage(title: "تعذّر إكمال العملية", body: body)
    }
}

private func localizedAuthError(_ error: Error) -> String {
    let raw = error.localizedDescription.lowercased()
    if raw.contains("invalid login") || raw.contains("invalid_credentials") {
        return "البريد الإلكتروني أو كلمة المرور غير صحيحة."
    }
    if raw.contains("email not confirmed") {
        return "أكد بريدك الإلكتروني أولًا ثم حاول تسجيل الدخول."
    }
    if raw.contains("already registered") || raw.contains("already been registered") {
        return "هذا البريد مسجّل بالفعل. استخدم تسجيل الدخول."
    }
    if raw.contains("rate limit") {
        return "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا."
    }
    if raw.contains("network") || raw.contains("internet") || raw.contains("offline") {
        return "تحقق من اتصال الإنترنت ثم حاول مجددًا."
    }
    return "حدث خطأ غير متوقع. حاول مجددًا بعد قليل."
}
