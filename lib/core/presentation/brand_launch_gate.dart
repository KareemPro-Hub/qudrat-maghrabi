import 'dart:ui';

import 'package:flutter/material.dart';

class BrandLaunchGate extends StatefulWidget {
  const BrandLaunchGate({required this.child, super.key});

  final Widget child;

  @override
  State<BrandLaunchGate> createState() => _BrandLaunchGateState();
}

class _BrandLaunchGateState extends State<BrandLaunchGate>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final AnimationController _controller;
  late final Animation<double> _markOpacity;
  late final Animation<double> _markScale;
  late final Animation<double> _markLift;
  late final Animation<double> _haloOpacity;
  late final Animation<double> _haloScale;
  late final Animation<double> _wordmarkOpacity;
  late final Animation<double> _wordmarkLift;
  late final Animation<double> _wordmarkReveal;
  bool _finished = false;
  bool _wentToBackground = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 6600),
      animationBehavior: AnimationBehavior.preserve,
    );
    _markOpacity = CurvedAnimation(
      parent: _controller,
      curve: const Interval(.02, .16, curve: Curves.easeOutCubic),
    );
    _markScale =
        TweenSequence<double>([
          TweenSequenceItem(tween: Tween(begin: .74, end: 1.055), weight: 72),
          TweenSequenceItem(tween: Tween(begin: 1.055, end: 1), weight: 28),
        ]).animate(
          CurvedAnimation(
            parent: _controller,
            curve: const Interval(.02, .25, curve: Curves.easeOutCubic),
          ),
        );
    _markLift = Tween<double>(begin: 0, end: -50).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.27, .46, curve: Curves.easeInOutCubicEmphasized),
      ),
    );
    _haloOpacity = Tween<double>(begin: 0, end: .72).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.03, .22, curve: Curves.easeOut),
      ),
    );
    _haloScale = Tween<double>(begin: .68, end: 1.08).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.02, .38, curve: Curves.easeOutCubic),
      ),
    );
    _wordmarkOpacity = CurvedAnimation(
      parent: _controller,
      curve: const Interval(.44, .59, curve: Curves.easeOutCubic),
    );
    _wordmarkLift = Tween<double>(begin: 26, end: 0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.43, .64, curve: Curves.easeOutCubic),
      ),
    );
    _wordmarkReveal = Tween<double>(begin: .01, end: 1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(.43, .66, curve: Curves.easeOutCubic),
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
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _wentToBackground = true;
      return;
    }

    if (state == AppLifecycleState.resumed && _wentToBackground) {
      _wentToBackground = false;
      if (mounted) {
        setState(() => _finished = false);
        _controller.forward(from: 0);
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 620),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) =>
          FadeTransition(opacity: animation, child: child),
      child: _finished
          ? KeyedSubtree(key: const Key('app-content'), child: widget.child)
          : _BrandLaunchScene(
              key: const Key('brand-launch-scene'),
              markOpacity: _markOpacity,
              markScale: _markScale,
              markLift: _markLift,
              haloOpacity: _haloOpacity,
              haloScale: _haloScale,
              wordmarkOpacity: _wordmarkOpacity,
              wordmarkLift: _wordmarkLift,
              wordmarkReveal: _wordmarkReveal,
            ),
    );
  }
}

class _BrandLaunchScene extends StatelessWidget {
  const _BrandLaunchScene({
    required this.markOpacity,
    required this.markScale,
    required this.markLift,
    required this.haloOpacity,
    required this.haloScale,
    required this.wordmarkOpacity,
    required this.wordmarkLift,
    required this.wordmarkReveal,
    super.key,
  });

  final Animation<double> markOpacity;
  final Animation<double> markScale;
  final Animation<double> markLift;
  final Animation<double> haloOpacity;
  final Animation<double> haloScale;
  final Animation<double> wordmarkOpacity;
  final Animation<double> wordmarkLift;
  final Animation<double> wordmarkReveal;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF7FF),
      body: IgnorePointer(
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0, -.12),
              radius: .92,
              colors: [Color(0xFFFFFFFF), Color(0xFFFAF7FF), Color(0xFFF4EDFF)],
              stops: [0, .55, 1],
            ),
          ),
          child: Stack(
            children: [
              const Positioned(
                top: -125,
                right: -105,
                child: _AmbientGlow(color: Color(0x26FF4D9D), size: 300),
              ),
              const Positioned(
                bottom: -140,
                left: -105,
                child: _AmbientGlow(color: Color(0x247A2DD6), size: 330),
              ),
              Center(
                child: SizedBox(
                  width: 330,
                  height: 310,
                  child: AnimatedBuilder(
                    animation: Listenable.merge([
                      markOpacity,
                      markScale,
                      markLift,
                      haloOpacity,
                      haloScale,
                      wordmarkOpacity,
                      wordmarkLift,
                      wordmarkReveal,
                    ]),
                    builder: (context, _) {
                      return Stack(
                        alignment: Alignment.center,
                        children: [
                          Transform.translate(
                            offset: Offset(0, markLift.value),
                            child: Opacity(
                              opacity: haloOpacity.value,
                              child: Transform.scale(
                                scale: haloScale.value,
                                child: Container(
                                  width: 246,
                                  height: 142,
                                  decoration: const BoxDecoration(
                                    gradient: RadialGradient(
                                      colors: [
                                        Color(0x38FF7AAA),
                                        Color(0x1F8B45E8),
                                        Color(0x007A2DD6),
                                      ],
                                      stops: [0, .55, 1],
                                    ),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Transform.translate(
                            offset: Offset(0, markLift.value),
                            child: FadeTransition(
                              opacity: markOpacity,
                              child: ScaleTransition(
                                scale: markScale,
                                child: Image.asset(
                                  'assets/brand/qudrat_maghrabi_mark.png',
                                  key: const Key('brand-launch-mark'),
                                  width: 190,
                                  fit: BoxFit.contain,
                                  semanticLabel: 'شعار قدرات المغربي',
                                ),
                              ),
                            ),
                          ),
                          Transform.translate(
                            offset: Offset(0, 47 + wordmarkLift.value),
                            child: FadeTransition(
                              opacity: wordmarkOpacity,
                              child: ClipRect(
                                child: Align(
                                  alignment: Alignment.bottomCenter,
                                  heightFactor: wordmarkReveal.value,
                                  child: ClipRect(
                                    child: Align(
                                      alignment: Alignment.bottomCenter,
                                      heightFactor: .30,
                                      child: Image.asset(
                                        'assets/brand/qudrat_maghrabi_logo.png',
                                        key: const Key('brand-launch-wordmark'),
                                        width: 238,
                                        fit: BoxFit.contain,
                                        semanticLabel:
                                            'قدرات المغربي Qudrat Maghrabi',
                                      ),
                                    ),
                                  ),
                                ),
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
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 26, sigmaY: 26),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
    );
  }
}
