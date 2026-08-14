import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';

class BrandLaunchGate extends StatefulWidget {
  const BrandLaunchGate({required this.child, super.key});

  final Widget child;

  @override
  State<BrandLaunchGate> createState() => _BrandLaunchGateState();
}

class _BrandLaunchGateState extends State<BrandLaunchGate>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _markOpacity;
  late final Animation<double> _markScale;
  late final Animation<double> _markLift;
  late final Animation<double> _wordmarkOpacity;
  late final Animation<double> _wordmarkLift;
  bool _finished = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4600),
      animationBehavior: AnimationBehavior.preserve,
    );
    _markOpacity = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0, .18, curve: Curves.easeOut),
    );
    _markScale = Tween<double>(begin: .72, end: 1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0, .24, curve: Curves.easeOutBack),
      ),
    );
    _markLift = Tween<double>(begin: 0, end: -58).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.22, .4, curve: Curves.easeInOutCubic),
      ),
    );
    _wordmarkOpacity = CurvedAnimation(
      parent: _controller,
      curve: const Interval(.36, .58, curve: Curves.easeOut),
    );
    _wordmarkLift = Tween<double>(begin: 22, end: 0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.36, .6, curve: Curves.easeOutCubic),
      ),
    );
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        setState(() => _finished = true);
      }
    });
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 420),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: _finished
          ? KeyedSubtree(key: const Key('app-content'), child: widget.child)
          : _BrandLaunchScene(
              key: const Key('brand-launch-scene'),
              markOpacity: _markOpacity,
              markScale: _markScale,
              markLift: _markLift,
              wordmarkOpacity: _wordmarkOpacity,
              wordmarkLift: _wordmarkLift,
            ),
    );
  }
}

class _BrandLaunchScene extends StatelessWidget {
  const _BrandLaunchScene({
    required this.markOpacity,
    required this.markScale,
    required this.markLift,
    required this.wordmarkOpacity,
    required this.wordmarkLift,
    super.key,
  });

  final Animation<double> markOpacity;
  final Animation<double> markScale;
  final Animation<double> markLift;
  final Animation<double> wordmarkOpacity;
  final Animation<double> wordmarkLift;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F4FB),
      body: IgnorePointer(
        child: Stack(
          children: [
            const Positioned(
              top: -110,
              right: -95,
              child: _AmbientGlow(color: Color(0x22FF4D9D), size: 280),
            ),
            const Positioned(
              bottom: -125,
              left: -90,
              child: _AmbientGlow(color: Color(0x207A2DD6), size: 310),
            ),
            Center(
              child: SizedBox(
                width: 300,
                height: 270,
                child: AnimatedBuilder(
                  animation: Listenable.merge([
                    markOpacity,
                    markScale,
                    markLift,
                    wordmarkOpacity,
                    wordmarkLift,
                  ]),
                  builder: (context, _) {
                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        Transform.translate(
                          offset: Offset(0, markLift.value),
                          child: FadeTransition(
                            opacity: markOpacity,
                            child: ScaleTransition(
                              scale: markScale,
                              child: Image.asset(
                                'assets/brand/qudrat_maghrabi_mark.png',
                                key: const Key('brand-launch-mark'),
                                width: 188,
                                fit: BoxFit.contain,
                                semanticLabel: 'شعار قدرات المغربي',
                              ),
                            ),
                          ),
                        ),
                        Transform.translate(
                          offset: Offset(0, 30 + wordmarkLift.value),
                          child: FadeTransition(
                            opacity: wordmarkOpacity,
                            child: const Column(
                              key: Key('brand-launch-wordmark'),
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'قدرات المغربي',
                                  style: TextStyle(
                                    color: QmColors.deepPurple,
                                    fontSize: 30,
                                    fontWeight: FontWeight.w900,
                                    height: 1.1,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'QUDRAT MAGHRABI',
                                  textDirection: TextDirection.ltr,
                                  style: TextStyle(
                                    color: QmColors.purple,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 2.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AmbientGlow extends StatelessWidget {
  const _AmbientGlow({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
