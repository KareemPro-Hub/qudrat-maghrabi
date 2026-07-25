import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';
import 'package:url_launcher/url_launcher.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({
    required this.profile,
    required this.repository,
    required this.onProfileUpdated,
    required this.onSignOut,
    required this.onAccountDeleted,
    super.key,
  });

  final AuthProfile profile;
  final AccountRepository repository;
  final ValueChanged<AuthProfile> onProfileUpdated;
  final Future<void> Function() onSignOut;
  final Future<void> Function() onAccountDeleted;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late AuthProfile _profile = widget.profile;

  Future<void> _editProfile() async {
    final updated = await Navigator.of(context).push<AuthProfile>(
      MaterialPageRoute(
        builder: (_) =>
            EditProfileScreen(profile: _profile, repository: widget.repository),
      ),
    );
    if (updated == null || !mounted) return;
    setState(() => _profile = updated);
    widget.onProfileUpdated(updated);
  }

  Future<void> _signOut() async {
    Navigator.of(context).pop();
    await widget.onSignOut();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'حسابي',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_forward_rounded),
        ),
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 42),
          children: [
            _AccountHero(profile: _profile),
            const SizedBox(height: 28),
            const _SectionHeading(
              title: 'إدارة الحساب',
              subtitle: 'بياناتك وأمان حسابك',
            ),
            const SizedBox(height: 12),
            _SettingsCard(
              children: [
                _SettingTile(
                  key: const Key('edit-profile-tile'),
                  icon: Icons.manage_accounts_rounded,
                  title: 'تعديل البيانات',
                  subtitle: 'الاسم ورقم الجوال',
                  onTap: _editProfile,
                ),
                const _TileDivider(),
                _SettingTile(
                  key: const Key('change-password-tile'),
                  icon: Icons.lock_reset_rounded,
                  title: 'تغيير كلمة المرور',
                  subtitle: 'حدّث كلمة مرور حسابك بأمان',
                  onTap: () => Navigator.of(context).push<void>(
                    MaterialPageRoute(
                      builder: (_) =>
                          ChangePasswordScreen(repository: widget.repository),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),
            const _SectionHeading(
              title: 'الخصوصية والمساعدة',
              subtitle: 'كل ما تحتاجه واضح وفي مكان واحد',
            ),
            const SizedBox(height: 12),
            _SettingsCard(
              children: [
                _SettingTile(
                  key: const Key('privacy-tile'),
                  icon: Icons.verified_user_rounded,
                  title: 'سياسة الخصوصية',
                  subtitle: 'كيف نحمي بياناتك ونستخدمها',
                  onTap: () => _openDocument(
                    context,
                    title: 'سياسة الخصوصية',
                    kicker: 'أمان بياناتك أولويتنا',
                    sections: privacySections,
                    externalUrl: 'https://www.qudratmaghrabi.com/privacy',
                  ),
                ),
                const _TileDivider(),
                _SettingTile(
                  key: const Key('terms-tile'),
                  icon: Icons.gavel_rounded,
                  title: 'الشروط والأحكام',
                  subtitle: 'قواعد استخدام المنصة والتطبيق',
                  onTap: () => _openDocument(
                    context,
                    title: 'الشروط والأحكام',
                    kicker: 'استخدام واضح وعادل',
                    sections: termsSections,
                    externalUrl: 'https://www.qudratmaghrabi.com/terms',
                  ),
                ),
                const _TileDivider(),
                _SettingTile(
                  key: const Key('support-tile'),
                  icon: Icons.support_agent_rounded,
                  title: 'الدعم والمساعدة',
                  subtitle: 'تواصل معنا مباشرة',
                  onTap: () => Navigator.of(context).push<void>(
                    MaterialPageRoute(builder: (_) => const SupportScreen()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),
            const _SectionHeading(
              title: 'حول التطبيق',
              subtitle: 'قدرات المغربي — افهم وتفوّق',
            ),
            const SizedBox(height: 12),
            _SettingsCard(
              children: [
                _SettingTile(
                  icon: Icons.info_outline_rounded,
                  title: 'عن قدرات المغربي',
                  subtitle: 'الإصدار 1.0.0',
                  onTap: () => Navigator.of(context).push<void>(
                    MaterialPageRoute(
                      builder: (_) => const AboutApplicationScreen(),
                    ),
                  ),
                ),
                const _TileDivider(),
                _SettingTile(
                  icon: Icons.description_outlined,
                  title: 'تراخيص البرمجيات',
                  subtitle: 'المكتبات مفتوحة المصدر المستخدمة',
                  onTap: () => showLicensePage(
                    context: context,
                    applicationName: 'قدرات المغربي',
                    applicationVersion: '1.0.0',
                    applicationIcon: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Image.asset(
                        'assets/brand/qudrat_maghrabi_logo.png',
                        width: 80,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              key: const Key('sign-out-button'),
              onPressed: _signOut,
              icon: const Icon(Icons.logout_rounded),
              label: const Text('تسجيل الخروج'),
              style: OutlinedButton.styleFrom(
                foregroundColor: QmColors.deepPurple,
                minimumSize: const Size.fromHeight(56),
                side: const BorderSide(color: QmColors.border),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4F5),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFFFD3D8)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'منطقة حساسة',
                    style: TextStyle(
                      color: QmColors.error,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'يمكنك حذف حسابك وكل بياناتك المرتبطة به نهائيًا.',
                    style: TextStyle(
                      color: QmColors.textSecondary,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton.icon(
                    key: const Key('delete-account-tile'),
                    onPressed: () => Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => DeleteAccountScreen(
                          repository: widget.repository,
                          onDeleted: widget.onAccountDeleted,
                        ),
                      ),
                    ),
                    icon: const Icon(Icons.delete_forever_rounded),
                    label: const Text('حذف الحساب نهائيًا'),
                    style: TextButton.styleFrom(
                      foregroundColor: QmColors.error,
                      alignment: Alignment.centerRight,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountHero extends StatelessWidget {
  const _AccountHero({required this.profile});

  final AuthProfile profile;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [QmColors.deepPurple, QmColors.purple, QmColors.pink],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x337A2DD6),
            blurRadius: 28,
            offset: Offset(0, 16),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 76,
            height: 76,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .16),
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withValues(alpha: .4),
                width: 2,
              ),
            ),
            child: Text(
              profile.fullName.trim().isEmpty
                  ? 'ط'
                  : profile.fullName.trim().characters.first,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  profile.email,
                  textDirection: TextDirection.ltr,
                  textAlign: TextAlign.right,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Color(0xD9FFFFFF)),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .15),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    profile.role.arabicLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          style: const TextStyle(color: QmColors.textSecondary, fontSize: 12),
        ),
      ],
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D200D35),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Material(
        color: Colors.white,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: QmColors.border),
        ),
        child: Column(children: children),
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  const _SettingTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    super.key,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      leading: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: QmColors.lavender,
          borderRadius: BorderRadius.circular(15),
        ),
        child: Icon(icon, color: QmColors.purple),
      ),
      title: Text(
        title,
        style: const TextStyle(
          color: QmColors.textPrimary,
          fontWeight: FontWeight.w900,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(color: QmColors.textSecondary, fontSize: 12),
      ),
      trailing: const Icon(
        Icons.arrow_back_ios_new_rounded,
        size: 16,
        color: QmColors.textMuted,
      ),
    );
  }
}

class _TileDivider extends StatelessWidget {
  const _TileDivider();

  @override
  Widget build(BuildContext context) {
    return const Divider(
      height: 1,
      indent: 76,
      endIndent: 16,
      color: QmColors.border,
    );
  }
}

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({
    required this.profile,
    required this.repository,
    super.key,
  });

  final AuthProfile profile;
  final AccountRepository repository;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(
    text: widget.profile.fullName,
  );
  late final _phoneController = TextEditingController(
    text: widget.profile.phone,
  );
  bool _saving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _saving) return;
    setState(() => _saving = true);
    try {
      final updated = await widget.repository.updateProfile(
        profile: widget.profile,
        fullName: _nameController.text,
        phone: _phoneController.text,
      );
      if (!mounted) return;
      Navigator.of(context).pop(updated);
    } catch (error) {
      if (!mounted) return;
      setState(() => _saving = false);
      _showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AccountFormScaffold(
      title: 'تعديل البيانات',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _FormIntro(
              icon: Icons.manage_accounts_rounded,
              title: 'بياناتك الشخصية',
              body: 'اكتب اسمك الأول والثاني ورقم جوال صحيح للتواصل.',
            ),
            const SizedBox(height: 24),
            TextFormField(
              key: const Key('profile-name-input'),
              controller: _nameController,
              textInputAction: TextInputAction.next,
              decoration: _inputDecoration(
                label: 'الاسم الأول والثاني',
                icon: Icons.person_outline_rounded,
              ),
              validator: (value) {
                final parts =
                    value
                        ?.trim()
                        .split(RegExp(r'\s+'))
                        .where((part) => part.isNotEmpty)
                        .toList() ??
                    const [];
                if (parts.length < 2) return 'اكتب الاسم الأول والثاني';
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              key: const Key('profile-phone-input'),
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              textDirection: TextDirection.ltr,
              textAlign: TextAlign.right,
              decoration: _inputDecoration(
                label: 'رقم الجوال (اختياري)',
                icon: Icons.phone_outlined,
              ),
            ),
            const SizedBox(height: 14),
            TextFormField(
              initialValue: widget.profile.email,
              enabled: false,
              textDirection: TextDirection.ltr,
              textAlign: TextAlign.right,
              decoration: _inputDecoration(
                label: 'البريد الإلكتروني',
                icon: Icons.email_outlined,
              ),
            ),
            const SizedBox(height: 26),
            QmGradientButton(
              key: const Key('save-profile-button'),
              label: 'حفظ التعديلات',
              icon: Icons.check_rounded,
              isLoading: _saving,
              onPressed: _saving ? null : _save,
            ),
          ],
        ),
      ),
    );
  }
}

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({required this.repository, super.key});

  final AccountRepository repository;

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _saving) return;
    setState(() => _saving = true);
    try {
      await widget.repository.changePassword(
        currentPassword: _currentController.text,
        newPassword: _newController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تم تغيير كلمة المرور بنجاح',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      setState(() => _saving = false);
      _showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AccountFormScaffold(
      title: 'تغيير كلمة المرور',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _FormIntro(
              icon: Icons.lock_reset_rounded,
              title: 'أمّن حسابك',
              body: 'سنطلب كلمة المرور الحالية للتأكد أن الحساب يخصك.',
            ),
            const SizedBox(height: 24),
            TextFormField(
              key: const Key('current-password-input'),
              controller: _currentController,
              obscureText: true,
              decoration: _inputDecoration(
                label: 'كلمة المرور الحالية',
                icon: Icons.lock_outline_rounded,
              ),
              validator: (value) => value == null || value.isEmpty
                  ? 'أدخل كلمة المرور الحالية'
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              key: const Key('new-password-input'),
              controller: _newController,
              obscureText: true,
              decoration: _inputDecoration(
                label: 'كلمة المرور الجديدة',
                icon: Icons.password_rounded,
              ),
              validator: (value) => value == null || value.length < 8
                  ? 'استخدم 8 أحرف على الأقل'
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              key: const Key('confirm-password-input'),
              controller: _confirmController,
              obscureText: true,
              decoration: _inputDecoration(
                label: 'تأكيد كلمة المرور الجديدة',
                icon: Icons.verified_user_outlined,
              ),
              validator: (value) => value != _newController.text
                  ? 'كلمتا المرور غير متطابقتين'
                  : null,
            ),
            const SizedBox(height: 26),
            QmGradientButton(
              label: 'تحديث كلمة المرور',
              icon: Icons.security_rounded,
              isLoading: _saving,
              onPressed: _saving ? null : _save,
            ),
          ],
        ),
      ),
    );
  }
}

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({
    required this.repository,
    required this.onDeleted,
    super.key,
  });

  final AccountRepository repository;
  final Future<void> Function() onDeleted;

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final _passwordController = TextEditingController();
  bool _understood = false;
  bool _deleting = false;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    if (!_understood || _passwordController.text.isEmpty || _deleting) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'تأكيد الحذف النهائي',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        content: const Text(
          'سيُحذف الحساب والتقدم والنتائج والروابط المرتبطة به، ولا يمكن التراجع بعد التأكيد.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            key: const Key('confirm-delete-account-button'),
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: QmColors.error),
            child: const Text('نعم، احذف حسابي'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _deleting = true);
    try {
      await widget.repository.deleteAccount(password: _passwordController.text);
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
      await widget.onDeleted();
    } catch (error) {
      if (!mounted) return;
      setState(() => _deleting = false);
      _showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AccountFormScaffold(
      title: 'حذف الحساب',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _FormIntro(
            icon: Icons.delete_forever_rounded,
            title: 'قبل أن تغادر',
            body:
                'الحذف نهائي وليس تعطيلًا مؤقتًا. ستفقد الوصول إلى حسابك وكل بيانات التعلم.',
            danger: true,
          ),
          const SizedBox(height: 22),
          const _DeletionItem(
            icon: Icons.person_off_outlined,
            text: 'حساب تسجيل الدخول والملف الشخصي',
          ),
          const _DeletionItem(
            icon: Icons.school_outlined,
            text: 'الاشتراكات والتقدم في الدروس',
          ),
          const _DeletionItem(
            icon: Icons.fact_check_outlined,
            text: 'نتائج الاختبارات والإشعارات',
          ),
          const SizedBox(height: 18),
          TextField(
            key: const Key('delete-password-input'),
            controller: _passwordController,
            obscureText: true,
            decoration: _inputDecoration(
              label: 'كلمة المرور للتأكيد',
              icon: Icons.lock_outline_rounded,
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 10),
          CheckboxListTile(
            key: const Key('delete-understood-checkbox'),
            value: _understood,
            onChanged: (value) => setState(() => _understood = value ?? false),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            activeColor: QmColors.error,
            title: const Text(
              'أفهم أن الحذف نهائي ولا يمكن استرجاع البيانات.',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const Key('delete-account-button'),
            onPressed:
                _understood && _passwordController.text.isNotEmpty && !_deleting
                ? _delete
                : null,
            icon: _deleting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(Icons.delete_forever_rounded),
            label: Text(
              _deleting ? 'جاري الحذف النهائي' : 'حذف الحساب نهائيًا',
            ),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(58),
              backgroundColor: QmColors.error,
              disabledBackgroundColor: const Color(0xFFFFC3C8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
          const SizedBox(height: 14),
          TextButton(
            onPressed: () => _launch(
              context,
              'https://www.qudratmaghrabi.com/account-deletion',
            ),
            child: const Text('عرض صفحة حذف الحساب على الموقع'),
          ),
        ],
      ),
    );
  }
}

class _DeletionItem extends StatelessWidget {
  const _DeletionItem({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(
        children: [
          Icon(icon, color: QmColors.error, size: 21),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: QmColors.textSecondary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LegalDocumentScreen extends StatelessWidget {
  const LegalDocumentScreen({
    required this.title,
    required this.kicker,
    required this.sections,
    required this.externalUrl,
    super.key,
  });

  final String title;
  final String kicker;
  final List<LegalSection> sections;
  final String externalUrl;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 36),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: QmGradients.brand,
              borderRadius: BorderRadius.circular(28),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.verified_user_rounded,
                  color: Colors.white,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  kicker,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                const Text(
                  'آخر تحديث: يوليو 2026',
                  style: TextStyle(color: Color(0xD9FFFFFF)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          for (var index = 0; index < sections.length; index++)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(21),
                border: Border.all(color: QmColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '${index + 1}. ${sections[index].title}',
                    style: const TextStyle(
                      color: QmColors.textPrimary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    sections[index].body,
                    style: const TextStyle(
                      color: QmColors.textSecondary,
                      height: 1.7,
                    ),
                  ),
                ],
              ),
            ),
          OutlinedButton.icon(
            onPressed: () => _launch(context, externalUrl),
            icon: const Icon(Icons.open_in_new_rounded),
            label: const Text('فتح النسخة المنشورة على الموقع'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LegalSection {
  const LegalSection(this.title, this.body);

  final String title;
  final String body;
}

const privacySections = <LegalSection>[
  LegalSection(
    'البيانات التي نجمعها',
    'يجمع تطبيق ومنصة قدرات المغربي البيانات اللازمة لتشغيل الحساب مثل الاسم والبريد الإلكتروني ورقم الجوال، إضافة إلى الاشتراكات وتقدم الدروس ونتائج الاختبارات وبيانات الاستخدام الأساسية.',
  ),
  LegalSection(
    'كيف نستخدم البيانات',
    'نستخدم البيانات لتسجيل الدخول، وتقديم المحتوى، وحفظ التقدم والنتائج، وإدارة الاشتراكات، وإرسال إشعارات الخدمة، وتقديم الدعم وتحسين التجربة التعليمية.',
  ),
  LegalSection(
    'مقدمو الخدمة',
    'قد تُعالج البيانات بالقدر اللازم عبر خدمات موثوقة لتسجيل الدخول وقواعد البيانات واستضافة الفيديو ومعالجة المدفوعات. لا نبيع بياناتك الشخصية ولا نستخدمها للإعلانات الموجهة.',
  ),
  LegalSection(
    'الحماية والاحتفاظ',
    'نستخدم اتصالًا مشفرًا وضوابط وصول لحماية البيانات، ونحتفظ بها مدة وجود الحساب أو المدة اللازمة لتقديم الخدمة والوفاء بالمتطلبات النظامية المشروعة.',
  ),
  LegalSection(
    'حقوقك وخياراتك',
    'يمكنك تعديل بياناتك أو حذف حسابك وبياناته المرتبطة من داخل التطبيق. وقد نحتفظ فقط بما يلزم قانونًا لمنع الاحتيال أو الوفاء بالتزامات مالية أو نظامية معلنة.',
  ),
  LegalSection(
    'خصوصية الطلاب',
    'التطبيق تعليمي ومخصص للطالب وولي الأمر. ينبغي على ولي الأمر الإشراف على إنشاء واستخدام حسابات القاصرين وفق الأنظمة المعمول بها.',
  ),
  LegalSection(
    'التواصل معنا',
    'لأي سؤال متعلق بالخصوصية تواصل عبر البريد Qudrat.Maghrabi.Pro@gmail.com أو من صفحة الدعم داخل التطبيق.',
  ),
];

const termsSections = <LegalSection>[
  LegalSection(
    'القبول بالشروط',
    'باستخدام تطبيق أو منصة قدرات المغربي أو إنشاء حساب، فإنك توافق على هذه الشروط وسياسة الخصوصية.',
  ),
  LegalSection(
    'الحساب',
    'يجب تقديم بيانات صحيحة والمحافظة على سرية كلمة المرور. الحساب شخصي ولا يجوز مشاركته أو تمكين الغير من استخدامه.',
  ),
  LegalSection(
    'المحتوى التعليمي',
    'المحتوى مخصص للاستخدام الشخصي والتعليمي فقط. لا يجوز نسخه أو تسجيله أو إعادة توزيعه أو بيعه دون إذن كتابي.',
  ),
  LegalSection(
    'الاشتراكات والدفع',
    'تُعرض مدة الاشتراك والسعر بوضوح قبل الشراء. لا يضمن الاشتراك نتيجة محددة في الاختبار، لكنه يمنح الوصول للمحتوى المتفق عليه خلال مدته.',
  ),
  LegalSection(
    'الاستخدام المقبول',
    'يُمنع التحايل على حماية المحتوى أو مشاركة الحساب أو محاولة تعطيل التطبيق أو الوصول غير المصرح به إلى بيانات الآخرين.',
  ),
  LegalSection(
    'التعليق والحذف',
    'يجوز تعليق الحساب عند مخالفة الشروط. ويمكن للمستخدم حذف حسابه نهائيًا من قسم حسابي داخل التطبيق.',
  ),
  LegalSection(
    'التواصل والقانون',
    'للاستفسارات تواصل مع الدعم. تخضع الخدمة للأنظمة المعمول بها في المملكة العربية السعودية.',
  ),
];

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'الدعم والمساعدة',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const _FormIntro(
            icon: Icons.support_agent_rounded,
            title: 'نحن معك',
            body: 'اختر وسيلة التواصل المناسبة وسنساعدك في أسرع وقت.',
          ),
          const SizedBox(height: 18),
          _SupportOption(
            icon: Icons.email_outlined,
            title: 'البريد الإلكتروني',
            value: 'Qudrat.Maghrabi.Pro@gmail.com',
            onTap: () => _launch(
              context,
              'mailto:Qudrat.Maghrabi.Pro@gmail.com?subject=دعم تطبيق قدرات المغربي',
            ),
          ),
          const SizedBox(height: 12),
          _SupportOption(
            icon: Icons.chat_rounded,
            title: 'واتساب',
            value: '+966 54 806 6321',
            onTap: () => _launch(
              context,
              'https://wa.me/966548066321?text=مرحبًا، أحتاج مساعدة في تطبيق قدرات المغربي',
            ),
          ),
          const SizedBox(height: 12),
          _SupportOption(
            icon: Icons.language_rounded,
            title: 'مركز التواصل',
            value: 'qudratmaghrabi.com/contact',
            onTap: () =>
                _launch(context, 'https://www.qudratmaghrabi.com/contact'),
          ),
          const SizedBox(height: 18),
          const Text(
            'ساعات الدعم: السبت – الخميس، من 9 صباحًا إلى 10 مساءً.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: QmColors.textSecondary,
              fontSize: 12,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

class _SupportOption extends StatelessWidget {
  const _SupportOption({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: QmColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: QmGradients.brand,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Icon(icon, color: Colors.white),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    Text(
                      value,
                      textDirection: TextDirection.ltr,
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.open_in_new_rounded,
                color: QmColors.purple,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AboutApplicationScreen extends StatelessWidget {
  const AboutApplicationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'عن التطبيق',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: QmColors.border),
              ),
              child: Image.asset(
                'assets/brand/qudrat_maghrabi_logo.png',
                width: 126,
              ),
            ),
          ),
          const SizedBox(height: 22),
          Text(
            'قدرات المغربي',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          const Text(
            'لا تحفظ.. افهم وتفوّق 🔥',
            textAlign: TextAlign.center,
            style: TextStyle(color: QmColors.pink, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 20),
          const Text(
            'تطبيق تعليمي يساعد طلاب القدرات على مشاهدة الدروس، متابعة التقدم، التدريب، ومعرفة النتائج في تجربة عربية واضحة وآمنة.',
            textAlign: TextAlign.center,
            style: TextStyle(color: QmColors.textSecondary, height: 1.8),
          ),
          const SizedBox(height: 20),
          const Center(
            child: Text(
              'الإصدار 1.0.0 (1)',
              style: TextStyle(color: QmColors.textMuted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountFormScaffold extends StatelessWidget {
  const _AccountFormScaffold({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 36),
        children: [child],
      ),
    );
  }
}

class _FormIntro extends StatelessWidget {
  const _FormIntro({
    required this.icon,
    required this.title,
    required this.body,
    this.danger = false,
  });

  final IconData icon;
  final String title;
  final String body;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: danger
            ? const LinearGradient(
                colors: [Color(0xFFFFF1F3), Color(0xFFFFE4E8)],
              )
            : QmGradients.brand,
        borderRadius: BorderRadius.circular(25),
      ),
      child: Column(
        children: [
          Icon(icon, color: danger ? QmColors.error : Colors.white, size: 38),
          const SizedBox(height: 11),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: danger ? QmColors.error : Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            body,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: danger ? QmColors.textSecondary : const Color(0xE6FFFFFF),
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}

InputDecoration _inputDecoration({
  required String label,
  required IconData icon,
}) {
  return InputDecoration(
    labelText: label,
    prefixIcon: Icon(icon, color: QmColors.purple),
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: QmColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: QmColors.border),
    ),
  );
}

void _openDocument(
  BuildContext context, {
  required String title,
  required String kicker,
  required List<LegalSection> sections,
  required String externalUrl,
}) {
  Navigator.of(context).push<void>(
    MaterialPageRoute(
      builder: (_) => LegalDocumentScreen(
        title: title,
        kicker: kicker,
        sections: sections,
        externalUrl: externalUrl,
      ),
    ),
  );
}

Future<void> _launch(BuildContext context, String value) async {
  final uri = Uri.tryParse(value);
  if (uri != null && await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
    return;
  }
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text(
        'تعذّر فتح الرابط على هذا الجهاز',
        textAlign: TextAlign.center,
      ),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

void _showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        error is AccountFailure ? error.message : 'حدث خطأ غير متوقع',
        textAlign: TextAlign.center,
      ),
      behavior: SnackBarBehavior.floating,
      backgroundColor: QmColors.error,
    ),
  );
}
